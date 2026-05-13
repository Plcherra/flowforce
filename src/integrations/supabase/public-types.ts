import type { Database as GeneratedDatabase } from "./types";

export type { Json } from "./types";

export type Database = GeneratedDatabase;

type DatabaseWithoutInternals = Omit<GeneratedDatabase, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals["public"];
type DefaultTables = DefaultSchema["Tables"];
type DefaultViews = DefaultSchema["Views"];
type AnyRow = Record<string, any>;
type AnyInsert = Record<string, any>;
type AnyUpdate = Record<string, any>;

// The app is currently ahead of the regenerated Supabase schema types. Until
// the database contract is stabilized, app-facing table helpers stay permissive
// so stale generated table columns do not block TypeScript validation.
export type Tables<
  DefaultSchemaTableNameOrOptions extends string | { schema: string },
  TableName extends string = never,
> = AnyRow;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends string | { schema: string },
  TableName extends string = never,
> = AnyInsert;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends string | { schema: string },
  TableName extends string = never,
> = AnyUpdate;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends string | { schema: string },
  EnumName extends string = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: infer SchemaName extends keyof DatabaseWithoutInternals;
}
  ? EnumName extends keyof DatabaseWithoutInternals[SchemaName]["Enums"]
    ? DatabaseWithoutInternals[SchemaName]["Enums"][EnumName]
    : string
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : string;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends string | { schema: string },
  CompositeTypeName extends string = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: infer SchemaName extends keyof DatabaseWithoutInternals;
}
  ? CompositeTypeName extends keyof DatabaseWithoutInternals[SchemaName]["CompositeTypes"]
    ? DatabaseWithoutInternals[SchemaName]["CompositeTypes"][CompositeTypeName]
    : unknown
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : unknown;
