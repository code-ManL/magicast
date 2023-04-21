import type { ProxifiedFunctionCall, ProxifiedModule } from "../proxy/types";
import { builders } from "../builders";
import { getDefaultExportOptions } from "./config";
import { deepMergeObject } from "./deep-merge";

export interface AddVitePluginOptions {
  /**
   * The import path of the plugin
   */
  from: string;
  /**
   * The import name of the plugin
   * @default "default"
   */
  imported?: string;
  /**
   * The name of local variable
   */
  constructor: string;
  /**
   * The options of the plugin
   */
  options?: Record<string, any>;
}

export interface UpdateVitePluginConfigOptions {
  /**
   * The import path of the plugin
   */
  from: string;
  /**
   * The import name of the plugin
   * @default "default"
   */
  imported?: string;
}

export function addVitePlugin(
  magicast: ProxifiedModule<any>,
  plugin: AddVitePluginOptions
) {
  const config = getDefaultExportOptions(magicast);

  config.plugins ||= [];
  config.plugins.push(
    plugin.options
      ? builders.functionCall(plugin.constructor, plugin.options)
      : builders.functionCall(plugin.constructor)
  );

  magicast.imports.$add({
    from: plugin.from,
    local: plugin.constructor,
    imported: plugin.imported || "default",
  });

  return true;
}

export function findVitePluginCall(
  magicast: ProxifiedModule<any>,
  plugin: UpdateVitePluginConfigOptions | string
): ProxifiedFunctionCall | undefined {
  const _plugin =
    typeof plugin === "string" ? { from: plugin, imported: "default" } : plugin;

  const config = getDefaultExportOptions(magicast);

  const constructor = magicast.imports.$items.find(
    (i) =>
      i.from === _plugin.from && i.imported === (_plugin.imported || "default")
  )?.local;

  return config.plugins?.find(
    (p: any) => p && p.$type === "function-call" && p.$callee === constructor
  );
}

export function updateVitePluginConfig(
  magicast: ProxifiedModule<any>,
  plugin: UpdateVitePluginConfigOptions | string,
  handler: Record<string, any> | ((args: any[]) => any[])
) {
  const item = findVitePluginCall(magicast, plugin);
  if (!item) {
    return false;
  }

  if (typeof handler === "function") {
    item.$args = handler(item.$args);
  } else if (item.$args[0]) {
    deepMergeObject(item.$args[0], handler);
  } else {
    item.$args[0] = handler;
  }

  return true;
}
