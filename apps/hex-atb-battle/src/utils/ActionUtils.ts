import { Actor, ActorRef, IGameplayStateProvider } from '@lomo/logic-game-framework';

/**
 * 尝试将 unknown 的 gameplayState 转换为 IGameplayStateProvider
 */
export function getGameplayStateProvider(state: unknown): IGameplayStateProvider | undefined {
  if (isGameplayStateProvider(state)) {
    return state;
  }
  return undefined;
}

/**
 * 类型守卫：检查对象是否实现了 IGameplayStateProvider
 */
function isGameplayStateProvider(obj: any): obj is IGameplayStateProvider {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.getActor === 'function' &&
    Array.isArray(obj.aliveActors)
  );
}

/**
 * 从 gameplayState 获取所有存活 Actor
 * 如果无法获取，返回空数组
 */
export function getActorsFromGameplayState(state: unknown): Actor[] {
  const provider = getGameplayStateProvider(state);
  return provider ? provider.aliveActors : [];
}

/**
 * 获取 Actor 的显示名称
 * 如果无法获取实例，则返回 ID 或 "???"
 */
export function getActorDisplayName(actorRef: ActorRef | undefined, state: unknown): string {
  if (!actorRef) return '???';

  const provider = getGameplayStateProvider(state);
  if (provider) {
    const actor = provider.getActor(actorRef.id);
    if (actor) {
      return actor.displayName;
    }
  }

  return actorRef.id;
}
