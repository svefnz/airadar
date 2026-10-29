import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { Donut } from '../../src/components/charts/Donut';
import { TrendBars } from '../../src/components/charts/TrendBars';

/** web-app 规格: “图表使用真实数据”与空态呈现 */
describe('charts: 空数据渲染', () => {
  it('Donut 无数据时显示空态而非伪造统计', () => {
    const html = renderToStaticMarkup(React.createElement(Donut, { slices: [] }));
    expect(html).toContain('暂无数据');
    expect(html).not.toContain('100%');
  });

  it('Donut 有数据时渲染扇区与总数', () => {
    const html = renderToStaticMarkup(
      React.createElement(Donut, {
        slices: [
          { label: 'API', value: 3, color: 'red' },
          { label: '客户端', value: 1, color: 'blue' },
        ],
      }),
    );
    expect(html).toContain('API');
    expect(html).toContain('客户端');
    expect(html).not.toContain('暂无数据');
  });

  it('TrendBars 空数组不崩溃并渲染图表容器', () => {
    const html = renderToStaticMarkup(React.createElement(TrendBars, { values: [], labels: [] }));
    expect(html).toContain('<svg');
  });
});
