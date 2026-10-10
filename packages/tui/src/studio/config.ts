import type { TuiPermissionMode } from '../application/permission-mode.js';
import {
  ACP_CONFIG_MODEL,
  ACP_CONFIG_PERMISSION_MODE,
  ACP_CONFIG_THINKING_EFFORT,
  getTuiAcpSessionControlState,
  parseModelConfigValue,
} from '../acp/control-state.js';
import { modelSupportsVariant } from '../acp/model-selection.js';
import type { TuiModel, TuiSession } from '../runtime/port.js';
import type { StudioRuntime } from './runtime.js';
import { StudioProtocolError } from './errors.js';

export async function studioConfigOptions(runtime: StudioRuntime, session: TuiSession) {
  const control = await getTuiAcpSessionControlState(runtime, session);
  return {
    modes: control.modes,
    configOptions: control.configOptions,
  };
}

export async function studioSetConfigOption(
  runtime: StudioRuntime,
  session: TuiSession,
  configId: string,
  value: string,
): Promise<{ configOptions: Awaited<ReturnType<typeof getTuiAcpSessionControlState>>['configOptions'] }> {
  if (typeof value !== 'string') {
    throw new StudioProtocolError(-32602, 'Studio config values must be strings.');
  }
  if (configId === ACP_CONFIG_PERMISSION_MODE) {
    await runtime.setPermissionMode(parseStudioPermissionMode(value));
  } else if (configId === ACP_CONFIG_MODEL) {
    let selection;
    try {
      selection = parseModelConfigValue(value);
    } catch (error) {
      throw new StudioProtocolError(
        -32602,
        error instanceof Error ? error.message : 'Invalid model selection.',
      );
    }
    const models = await runtime.listModels(session.sessionId);
    if (!isAdvertisedModelSelection(models, selection)) {
      throw new StudioProtocolError(-32602, 'Model selection is not advertised.');
    }
    if (!(await runtime.selectSessionModel(selection, session.sessionId))) {
      throw new StudioProtocolError(-32602, 'Runtime rejected the model selection.');
    }
  } else if (configId === ACP_CONFIG_THINKING_EFFORT) {
    const refreshed = await runtime.getSession(session.sessionId);
    if (!refreshed.model?.providerId || !refreshed.model.modelId) {
      throw new StudioProtocolError(-32602, 'Select a session model before changing thinking effort.');
    }
    const models = await runtime.listModels(refreshed.sessionId);
    const selectedModel = models.find(
      (model) =>
        model.providerId === refreshed.model?.providerId &&
        model.modelId === refreshed.model.modelId &&
        modelSupportsVariant(model, refreshed.model.variant),
    );
    if (!selectedModel?.effortOptions?.includes(value)) {
      throw new StudioProtocolError(-32602, `Thinking effort is not advertised: ${value}`);
    }
    if (
      !(await runtime.selectSessionModel(
        {
          providerId: refreshed.model.providerId,
          modelId: refreshed.model.modelId,
          ...(refreshed.model.variant !== undefined ? { variant: refreshed.model.variant } : {}),
          thinking: { effort: value },
        },
        refreshed.sessionId,
      ))
    ) {
      throw new StudioProtocolError(-32602, 'Runtime rejected thinking effort.');
    }
  } else {
    throw new StudioProtocolError(-32602, `Unsupported config option: ${configId}`);
  }
  const updated = await runtime.getSession(session.sessionId);
  const control = await getTuiAcpSessionControlState(runtime, updated);
  return { configOptions: control.configOptions };
}

function parseStudioPermissionMode(value: string): TuiPermissionMode {
  if (value === 'default' || value === 'auto' || value === 'bypassPermissions') return value;
  throw new StudioProtocolError(-32602, `Unsupported permission mode: ${value}`);
}

function isAdvertisedModelSelection(
  models: readonly TuiModel[],
  selection: { readonly providerId: string; readonly modelId: string; readonly variant?: string },
): boolean {
  return models.some(
    (model) =>
      model.providerId === selection.providerId &&
      model.modelId === selection.modelId &&
      modelSupportsVariant(model, selection.variant),
  );
}
