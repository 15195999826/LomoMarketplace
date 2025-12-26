"use client";

import { useState, useCallback, useMemo } from "react";
import type { InkMonListItem } from "@inkmon/core";
import { TeamSlot } from "./TeamSlot";
import { InkMonPicker } from "./InkMonPicker";
import styles from "./BattleSimulator.module.css";

interface BattleSimulatorProps {
  inkmons: InkMonListItem[];
}

type TeamState = (InkMonListItem | null)[];

export function BattleSimulator({ inkmons }: BattleSimulatorProps) {
  const [teamA, setTeamA] = useState<TeamState>([null, null, null]);
  const [teamB, setTeamB] = useState<TeamState>([null, null, null]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<{ team: 'A' | 'B'; index: number } | null>(null);
  const [battleResult, setBattleResult] = useState<string | null>(null);

  // 获取已选择的 InkMon 名称
  const selectedByTeamA = useMemo(
    () => teamA.filter(Boolean).map(i => i!.name_en),
    [teamA]
  );
  const selectedByTeamB = useMemo(
    () => teamB.filter(Boolean).map(i => i!.name_en),
    [teamB]
  );

  // 计算队伍总属性
  const calcTeamStats = (team: TeamState) => {
    const members = team.filter(Boolean) as InkMonListItem[];
    return {
      count: members.length,
      totalHp: members.reduce((sum, m) => sum + m.base_stats.hp, 0),
      totalAtk: members.reduce((sum, m) => sum + m.base_stats.attack, 0),
      totalDef: members.reduce((sum, m) => sum + m.base_stats.defense, 0),
    };
  };

  const teamAStats = calcTeamStats(teamA);
  const teamBStats = calcTeamStats(teamB);

  // 打开选择器
  const handleSlotClick = (team: 'A' | 'B', index: number) => {
    setActiveSlot({ team, index });
    setPickerOpen(true);
  };

  // 选择 InkMon
  const handleSelectInkmon = useCallback((inkmon: InkMonListItem) => {
    if (!activeSlot) return;

    if (activeSlot.team === 'A') {
      setTeamA(prev => {
        const newTeam = [...prev];
        newTeam[activeSlot.index] = inkmon;
        return newTeam;
      });
    } else {
      setTeamB(prev => {
        const newTeam = [...prev];
        newTeam[activeSlot.index] = inkmon;
        return newTeam;
      });
    }

    setPickerOpen(false);
    setActiveSlot(null);
    setBattleResult(null);
  }, [activeSlot]);

  // 移除 InkMon
  const handleRemove = (team: 'A' | 'B', index: number) => {
    if (team === 'A') {
      setTeamA(prev => {
        const newTeam = [...prev];
        newTeam[index] = null;
        return newTeam;
      });
    } else {
      setTeamB(prev => {
        const newTeam = [...prev];
        newTeam[index] = null;
        return newTeam;
      });
    }
    setBattleResult(null);
  };

  // 模拟战斗 (简单对比)
  const handleBattle = () => {
    const powerA = teamAStats.totalHp + teamAStats.totalAtk + teamAStats.totalDef;
    const powerB = teamBStats.totalHp + teamBStats.totalAtk + teamBStats.totalDef;

    // 加入一点随机性
    const randomFactor = 0.9 + Math.random() * 0.2;
    const adjustedPowerA = powerA * randomFactor;
    const adjustedPowerB = powerB * (2 - randomFactor);

    if (Math.abs(adjustedPowerA - adjustedPowerB) < 10) {
      setBattleResult("势均力敌！这场战斗将会非常激烈！");
    } else if (adjustedPowerA > adjustedPowerB) {
      setBattleResult(`队伍 A 获胜！总战力 ${powerA} vs ${powerB}`);
    } else {
      setBattleResult(`队伍 B 获胜！总战力 ${powerB} vs ${powerA}`);
    }
  };

  const canBattle = teamAStats.count > 0 && teamBStats.count > 0;

  return (
    <div className={styles.simulator}>
      <div className={styles.battleArea}>
        <div className={styles.teamsContainer}>
          {/* 队伍 A */}
          <div className={styles.team}>
            <div className={styles.teamHeader}>
              <div className={`${styles.teamIcon} ${styles.teamA}`}>A</div>
              <h3 className={styles.teamTitle}>队伍 A</h3>
              <span className={styles.teamStats}>
                {teamAStats.count}/3 · 总战力 {teamAStats.totalHp + teamAStats.totalAtk + teamAStats.totalDef}
              </span>
            </div>
            <div className={styles.slots}>
              {teamA.map((inkmon, index) => (
                <TeamSlot
                  key={index}
                  inkmon={inkmon}
                  slotIndex={index}
                  onClick={() => handleSlotClick('A', index)}
                  onRemove={() => handleRemove('A', index)}
                />
              ))}
            </div>
          </div>

          {/* VS */}
          <div className={styles.vsSection}>
            <div className={styles.vsIcon}>VS</div>
            <button
              className={styles.battleButton}
              onClick={handleBattle}
              disabled={!canBattle}
            >
              ⚔️ 开始战斗
            </button>
          </div>

          {/* 队伍 B */}
          <div className={styles.team}>
            <div className={styles.teamHeader}>
              <div className={`${styles.teamIcon} ${styles.teamB}`}>B</div>
              <h3 className={styles.teamTitle}>队伍 B</h3>
              <span className={styles.teamStats}>
                {teamBStats.count}/3 · 总战力 {teamBStats.totalHp + teamBStats.totalAtk + teamBStats.totalDef}
              </span>
            </div>
            <div className={styles.slots}>
              {teamB.map((inkmon, index) => (
                <TeamSlot
                  key={index}
                  inkmon={inkmon}
                  slotIndex={index}
                  onClick={() => handleSlotClick('B', index)}
                  onRemove={() => handleRemove('B', index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 战斗结果 */}
      {battleResult && (
        <div className={styles.resultSection}>
          <h3 className={styles.resultTitle}>🎯 战斗结果</h3>
          <p className={styles.resultMessage}>{battleResult}</p>
        </div>
      )}

      {/* 提示 */}
      {!canBattle && (
        <div className={styles.hint}>
          <span className={styles.hintIcon}>💡</span>
          请为两支队伍各选择至少一只 InkMon 后开始战斗
        </div>
      )}

      {/* InkMon 选择器 */}
      <InkMonPicker
        isOpen={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setActiveSlot(null);
        }}
        inkmons={inkmons}
        onSelect={handleSelectInkmon}
        selectedByTeamA={selectedByTeamA}
        selectedByTeamB={selectedByTeamB}
        currentTeam={activeSlot?.team || 'A'}
      />
    </div>
  );
}
