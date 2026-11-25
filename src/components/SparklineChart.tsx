import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type { SparklinePoint } from '../types/twe';

interface SparklineChartProps {
  data: SparklinePoint[];
  positive: boolean;
  height?: number;
  showTooltip?: boolean;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  positive,
  height = 42,
  showTooltip = false,
}) => {
  const strokeColor = positive ? '#16A34A' : '#DC2626';
  const fillId = React.useId().replace(/:/g, '');

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.28} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <YAxis domain={['dataMin', 'dataMax']} hide />
          {showTooltip && (
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--twe-bg-elevated)',
                borderColor: 'var(--twe-border)',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--twe-text-primary)',
                padding: '4px 8px',
              }}
              formatter={(value) => [`$${Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`, 'Price']}
              labelFormatter={(label) => `UTC ${label}`}
            />
          )}
          <Area
            type="monotone"
            dataKey="price"
            stroke={strokeColor}
            strokeWidth={1.75}
            fill={`url(#${fillId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RsiSignalLabel: React.FC<{ rsi: number }> = ({ rsi }) => {
  let regime = 'Neutral';
  let tone = 'text-neutral-600 dark:text-neutral-300';
  if (rsi >= 70) {
    regime = 'Overbought';
    tone = 'text-amber-600 dark:text-amber-400';
  } else if (rsi <= 30) {
    regime = 'Oversold';
    tone = 'text-emerald-600 dark:text-emerald-400';
  }

  return (
    <span className={`font-mono text-xs tabular-nums ${tone}`}>
      {rsi.toFixed(1)} · {regime}
    </span>
  );
};
