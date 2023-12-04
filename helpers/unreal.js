// Here we parse the asyncapi object into a format suitable for our mustache files

export function toCppValidPascalCase(input) {
    const sanitized = input.replace(/[^a-zA-Z0-9]+/g, '_');

    // Ensure the first letter and each letter following underscores are uppercase
    const pascalCase = sanitized.replace(/(?:^|_)([a-zA-Z0-9])/g, (match, letter) => letter.toUpperCase());

    // Remove leading and trailing underscores
    return pascalCase.replace(/_/g, '');
}

function isPrimitiveType(type) {
    const primitiveTypes = [
        'int32',
        'int64',
        'integer',
        'long',
        'float',
        'number',
        'double',
        'string',
        'byte',
        'binary',
        'bytearray',
        'password',
        'boolean',
        'date',
        'date-time',
        'datetime',
        'uuid',
        'anytype',
        'any',
    ];

    return primitiveTypes.includes(type.toLowerCase());
}

function toUnrealType(type, format) {
    const typeMapping = {
        int32: "int32",
        int64: "int64",
        integer: "int32",
        long: "int64",
        float: "float",
        number: "double",
        double: "double",
        string: "FString",
        byte: "uint8",
        binary: "TArray<uint8>",
        bytearray: "TArray<uint8>",
        password: "FString",
        boolean: "bool",
        date: "FDateTime",
        Date: "FDateTime",
        "date-time": "FDateTime",
        datetime: "FDateTime",
        array: "TArray",
        set: "TSet",
        list: "TArray",
        map: "TMap",
        object: "TSharedPtr<FJsonObject>",
        uuid: "FGuid",
        any: "TSharedPtr<FJsonValue>",
        anytype: "TSharedPtr<FJsonValue>",
        object: "TSharedPtr<FJsonObject>",
    };

    // Use the format first as it's more specific, if not the type, and defaulting to the input
    // ex: https://www.asyncapi.com/docs/reference/specification/v2.6.0#dataTypeFormat
    if (format) {
        return typeMapping[format.toLowerCase()] || typeMapping[type.toLowerCase()] || type;
    }
    else {
        return typeMapping[type.toLowerCase()] || type;
    }
}

function toDefaultValue(type, format, defaultValue) {
    const numberTypes = [
        'int32',
        'int64',
        'integer',
        'long',
        'float',
        'number',
        'double'
    ];

    if (type == "string" && defaultValue != undefined) {
        return "TEXT(" + defaultValue + ")";
    }
    else if (numberTypes.includes(type)) {
        if (!defaultValue)
            return "0";
    }
    else if (type == "boolean") {
        if (defaultValue == "true" || defaultValue == "false")
            return defaultValue;
        else
            return "false";
    }

    return defaultValue;
}

export function initView({ asyncapi, params }) {
    const view = {}

    // Process params:
    view.cppNamespaceDeclarations = params?.cppNamespace.split("::");
    view.unrealModuleName = params?.unrealModuleName;
    view.modelNamePrefix = params?.modelNamePrefix ?? "";

    // Global data
    view.appName = asyncapi.info().title();
    view.appDescription = asyncapi.info().description();
    view.version = asyncapi.version();
    view.infoEmail = asyncapi.info().contact();

    const license = asyncapi.info().license();
    if (license) {
        view.license = license.name() + " " + license.url();
    }

    view.dllapi = view.unrealModuleName.toUpperCase() + "_API";

    return view;
}

function makeContextualTypeName(schemaView, contextId) {
    // Attempts to improve anonymous typenames if possible, based on context
    if (schemaView.isCppObject && contextId && schemaView.classname?.startsWith('Anonymous')) {
        schemaView.classname = toCppValidPascalCase(contextId) + '_Type';
        schemaView.datatype = schemaView.classname;
    }
}

export function getSchemaView(id, schema) {
    //TODO: handle includes ! there is dependencies()

    const schemaView = {}
    schemaView.asyncapi_schema = schema;
    schemaView.asyncapi_id = id;

    if (id) {
        schemaView.id = id;
        schemaView.name = toCppValidPascalCase(id);
        schemaView.title = schema.title();
        schemaView.description = schema.description();
        schemaView.examples = schema.examples();
    }

    if (schema.properties()) // Object with properties = struct definition
    {
        // keep "classname" only for the actual classes
        schemaView.classname = toCppValidPascalCase(schema.id());
        schemaView.datatype = schemaView.classname;
        schemaView.isCppObject = true; // We will use this flag to build a list of models later

        schemaView.vars = []
        for (const [childId, property] of Object.entries(schema.properties())) {
            // Property is also a schema
            const propView = getSchemaView(childId, property);

            if (childId) {
                propView.required = schema.required?.()?.includes(childId);
                makeContextualTypeName(propView, childId);
            }

            schemaView.vars.push(propView);
        }
    }
    else if (schema.type() == 'object') // object type that doesn't have properties
    {
        if (schema.additionalProperties()) {
            // No properties but additional Properties = map
            // https://swagger.io/docs/specification/data-models/dictionaries/

            if (schema.additionalProperties() == true) // we can't tell what is in here
                schemaView.datatype = 'TMap<FString, FJsonValue>';
            else {
                const valueSchemaView = getSchemaView(null, schema.additionalProperties());
                makeContextualTypeName(valueSchemaView, id);
                schemaView.datatype = "TMap<FString, " + valueSchemaView.datatype + ">";
                schemaView.models = [valueSchemaView];
                //TODO: this should trigger an import or add a model !, we first have to determine if it'sa dependency or not, and perhaps only the dependencies() thing can help us with that, otherwise we have to assume the type is either primitive or an anonymous model
            }
            schemaView.isMap = true;
        }
        else // object treated as primitive type by default
        {
            schemaView.datatype = toUnrealType(schema.type(), schema.format());
        }
    }
    else if (schema.type() == 'array') // container type
    {
        // If items undefined or array, we don' t know how to handle polymorphic arrays in C++
        if (schema.items?.()?.length > 1) {
            throw new Error(`Can't handle array type: ${schema.id()}`);
        }

        const itemSchemaView = getSchemaView(null, Array.isArray(schema.items()) ? schema.items()[0] : schema.items());
        makeContextualTypeName(itemSchemaView, id);

        schemaView.datatype = "TArray<" + itemSchemaView.datatype + ">";
        schemaView.isArray = true;
        schemaView.models = [itemSchemaView];
    }
    else {
        if (!isPrimitiveType(schema.type())) {
            throw new Error(`Unknown type found: ${schema.type()} ${schema.id()}`);
        }

        schemaView.datatype = toUnrealType(schema.type(), schema.format());
        schemaView.defaultValue = toDefaultValue(schema.type(), schema.format(), schema.default())

        if (schema.type() == "string") {
            schemaView.isString = true;
            if (schema.enum()) {
                schemaView.isEnum = true;

                if (id) {
                    schemaView.enumName = schemaView.name + "Values";
                    schemaView.datatypeWithEnum = schemaView.enumName;
                }

                schemaView.enumVars = [];
                for (const enumValue of schema.enum()) {
                    let enumVar = {};
                    enumVar.value = enumValue;
                    enumVar.name = toCppValidPascalCase(enumVar.value);
                    schemaView.enumVars.push(enumVar);
                }
            }
        }
    }

    return schemaView;
}

export function collectAllModels(view)
{
    // Not super proud of this design but essentially we first constructed a massive tree of schemas, 
    // now we parse it again to pull all the models back to the top list that we will later generate.
    const models = []

    if(view.models)
    {
        view.models.forEach((varSchemaView) => {
            models.push(...collectAllModels(varSchemaView));
          });

        models.push(...view.models);
    }

    if(view.isCppObject)
    {
        view.vars.forEach((varSchemaView) => {
            models.push(...collectAllModels(varSchemaView));
          });

        if(!view.ignoreModel)
            models.push(view);
    }
    else if(view.isMessage)
    {
        if(view.headers)
            models.push(...collectAllModels(view.headers));

        if(view.payload)
            models.push(...collectAllModels(view.payload));

        models.push(view);
    }

    return models;
}

export function getMessageView(message) {
    const messageView = {};
    messageView.asyncapi_message = message;

    messageView.name = message.name();
    messageView.title = message.title();
    messageView.description = message.description();
    messageView.examples = message.examples();
    messageView.classname = toCppValidPascalCase(message.name());
    messageView.isMessage = true;

    if (message.hasHeaders()) {
        messageView.headers = getSchemaView(null, message.headers());
        messageView.headers.ignoreModel = true;
    }

    if (message.hasPayload()) {
        messageView.payload = getSchemaView(null, message.payload());
        messageView.payload.ignoreModel = true;
    }

    return messageView;
}

export function getTopicView(channel) {
    const topicView = {};
    topicView.asyncapi_channel = channel;

    topicView.id = channel.id();
    topicView.name = channel.id();
    topicView.classname = toCppValidPascalCase(channel.id());;
    topicView.topicClassName = topicView.classname;
    topicView.description = channel.description();

    topicView.operations = [];

    for (const operation of channel.operations()) {
        for (const message of operation.messages()) {
            //TODO: this doesn't take into account that messages may be repeated across operations
            const messageView = getMessageView(message);
            if (operation.isSend())
                messageView.isSend = true;

            if (operation.isReceive())
                messageView.isReceive = true;

            topicView.operations.push(messageView);
        }
    }

    return topicView;
}