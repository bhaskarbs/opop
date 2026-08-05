package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import java.util.List;
import java.util.Map;

/** Small helpers for building a Tool's JSON input schema — the anthropic-java SDK's own builder
 * for this (Tool.InputSchema/.Properties) is a thin wrapper around raw JsonValue maps, not a
 * fluent schema DSL, so building each property by hand gets verbose fast with more than one or
 * two tools. */
final class ToolSchemas {

    private ToolSchemas() {}

    static JsonValue stringProperty(String description) {
        return JsonValue.from(Map.of("type", "string", "description", description));
    }

    static JsonValue numberProperty(String description) {
        return JsonValue.from(Map.of("type", "number", "description", description));
    }

    static JsonValue booleanProperty(String description) {
        return JsonValue.from(Map.of("type", "boolean", "description", description));
    }

    static JsonValue enumProperty(String description, List<String> allowedValues) {
        return JsonValue.from(Map.of("type", "string", "enum", allowedValues, "description", description));
    }

    static JsonValue stringArrayProperty(String description) {
        return JsonValue.from(Map.of(
                "type", "array", "items", Map.of("type", "string"), "description", description));
    }

    static JsonValue enumArrayProperty(String description, List<String> allowedValues) {
        return JsonValue.from(Map.of(
                "type",
                "array",
                "items",
                Map.of("type", "string", "enum", allowedValues),
                "description",
                description));
    }

    static Tool.InputSchema schema(Map<String, JsonValue> properties) {
        return schema(properties, List.of());
    }

    static Tool.InputSchema schema(Map<String, JsonValue> properties, List<String> required) {
        Tool.InputSchema.Properties.Builder propertiesBuilder = Tool.InputSchema.Properties.builder();
        properties.forEach(propertiesBuilder::putAdditionalProperty);
        return Tool.InputSchema.builder()
                .type(JsonValue.from("object"))
                .properties(propertiesBuilder.build())
                .required(required)
                .build();
    }
}
