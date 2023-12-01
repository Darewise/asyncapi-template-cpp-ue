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
        'object', // considered a primitive type here because we will save it as Json
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
    if(format)
    {
        return typeMapping[format.toLowerCase()] || typeMapping[type.toLowerCase()] || type;
    }
    else
    {
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

    if(type == "string" && defaultValue != undefined)
    {
        return "TEXT(" + defaultValue + ")";
    }
    else if(numberTypes.includes(type))
    {
        if(!defaultValue)
            return "0";
    }
    else if(type == "boolean")
    {
        if(defaultValue == "true" || defaultValue == "false")
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

export function getSchemaView(id, schema, imports, exports) {
    const schemaView = {}

    if (id) {
        schemaView.id = id;
        schemaView.name = toCppValidPascalCase(id);
        schemaView.classname = schemaView.name;
        schemaView.title = schema.title();
        schemaView.description = schema.description();
        schemaView.examples = schema.examples();
    }

    if (schema.properties()) // object type
    {
        schemaView.vars = []
        for (const [id, property] of Object.entries(schema.properties())) {
            // Property is also a schema
            const propView = getSchemaView(id, property, imports, exports);
            if (id) {
                propView.required = schema.required?.().includes(id);
            }

            schemaView.vars.push(propView);
        }

        //TODO: should i use dependencies() for imports? we need to print all that

        // export the type so it can be imported later
        // probably this should actually be a map of some identifier to the generated classname, that would be more useful
        exports.push(schemaView.classname);
    }
    else if (schema.items() != null) // container type
    {
        //TODO : !
        throw new Error('Container type found and not currently handled : ${schema.id()}')
    }
    else {
        if (!isPrimitiveType(schema.type())) {
            throw new Error(`Unknown type found: ${schema.type()} ${schema.id()}`);
        }

        schemaView.dataType = toUnrealType(schema.type(), schema.format());
        schemaView.defaultValue = toDefaultValue(schema.type(), schema.format(), schema.default())
       
        if(schema.type() == "string")
        {
            if(schema.enum())
            {
                schemaView.isEnum = true;

                if(id)
                {
                    schemaView.enumName = schemaView.name + "Values";
                    schemaView.datatypeWithEnum = schemaView.enumName;
                }
                
                schemaView.enumVars = [];
                for(const enumValue of schema.enum())
                {
                    let enumVar = {};
                    enumVar.value = JSON.stringify(enumValue);
                    enumVar.name = toCppValidPascalCase(enumVar.value);
                    schemaView.enumVars.push(enumVar);
                }
            }
            else
            {
                schemaView.isString = true;
            }
        }        
    }

    return schemaView;
}

export function getMessageView(message) {
    const messageView = {}

    messageView.name = message.name();
    messageView.title = message.title();
    messageView.description = message.description();
    messageView.examples = message.examples();
    messageView.classname = toCppValidPascalCase(message.name());

    let imports = []
    let exports = []

    if (message.hasHeaders()) {
        messageView.headers = getSchemaView(null, message.headers(), imports, exports);
    }

    if (message.hasPayload()) {
        messageView.payload = getSchemaView(null, message.payload(), imports, exports);
    }

    return messageView;
}

export function addChannelToView({ channel, view }) {
    const channelView = {
        ...view
    };

    channelView.id = channel.id();
    channelView.classname = toCppValidPascalCase(channel.id());
    channelView.description = channel.description();


    return channelView;
}