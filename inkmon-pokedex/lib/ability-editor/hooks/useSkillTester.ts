import { useState, useCallback, useMemo } from 'react';
import { useBattleDirector, type UseBattleDirectorResult } from '@/lib/battle-replay/hooks/useBattleDirector';
import type { IBattleRecord } from '@inkmon/battle';
import { runSkillTest, type SkillTestConfig, type SkillTestResult } from '../runner/runSkillTest';

export interface UseSkillTesterResult {
  testResult: SkillTestResult | null;
  isRunning: boolean;
  runTest: (config: SkillTestConfig) => void;
  rerun: () => void;
  director: UseBattleDirectorResult | null;
}

const EMPTY_REPLAY: IBattleRecord = {
  version: '2.0',
  meta: {
    battleId: 'empty',
    recordedAt: 0,
    tickInterval: 100,
    totalFrames: 0,
    result: 'interrupted',
  },
  configs: {},
  initialActors: [],
  timeline: [],
};

export function useSkillTester(): UseSkillTesterResult {
  const [testResult, setTestResult] = useState<SkillTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [lastConfig, setLastConfig] = useState<SkillTestConfig | null>(null);

  const replay = useMemo(() => {
    if (testResult?.success && testResult.replay) {
      return testResult.replay;
    }
    return EMPTY_REPLAY;
  }, [testResult]);

  const directorResult = useBattleDirector(replay, {
    autoPlay: false,
    initialSpeed: 1,
  });

  const runTest = useCallback((config: SkillTestConfig) => {
    setIsRunning(true);
    setLastConfig(config);

    setTimeout(() => {
      const result = runSkillTest(config);
      setTestResult(result);
      setIsRunning(false);

      if (result.success) {
        directorResult.controls.reset();
        setTimeout(() => directorResult.controls.play(), 50);
      }
    }, 0);
  }, [directorResult.controls]);

  const rerun = useCallback(() => {
    if (lastConfig) {
      runTest(lastConfig);
    }
  }, [lastConfig, runTest]);

  return {
    testResult,
    isRunning,
    runTest,
    rerun,
    director: testResult?.success ? directorResult : null,
  };
}
