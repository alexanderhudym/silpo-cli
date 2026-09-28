import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type {
  JsonSchemaType,
  JsonSchemaValidator,
  jsonSchemaValidator,
} from "@modelcontextprotocol/sdk/validation";

function openWorld(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(openWorld);
  if (typeof schema !== "object" || schema === null) return schema;

  const relaxed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties" && value === false) continue;
    relaxed[key] = openWorld(value);
  }
  return relaxed;
}

export class OpenWorldValidator implements jsonSchemaValidator {
  private readonly inner = new AjvJsonSchemaValidator();

  getValidator<T>(schema: JsonSchemaType): JsonSchemaValidator<T> {
    return this.inner.getValidator<T>(openWorld(schema) as JsonSchemaType);
  }
}
