export type ChapterId = 'liber-1' | 'liber-2' | 'liber-3' | 'liber-4' | 'liber-5';

export interface Chapter {
  id: ChapterId;
  numeral: string;       // ローマ数字表記
  label: string;         // 章名
  description: string;   // 章の説明
}

export const chapters: Chapter[] = [
  {
    id: 'liber-1',
    numeral: 'Liber I',
    label: '序',
    description: 'Claude Code とは何か、どう始めるか。最初の一歩を踏み出すための章。',
  },
  {
    id: 'liber-2',
    numeral: 'Liber II',
    label: '基礎',
    description: 'プロンプトの書き方、コンテキストの渡し方。日々の使いこなしの土台。',
  },
  {
    id: 'liber-3',
    numeral: 'Liber III',
    label: '実践',
    description: '大きなタスクの分割、レビューの目、失敗からの回復。実戦の作法。',
  },
  {
    id: 'liber-4',
    numeral: 'Liber IV',
    label: '応用',
    description: 'Skills、Subagents、MCP、Hooks など、Claude Code を自分の環境に組み上げる。',
  },
  {
    id: 'liber-5',
    numeral: 'Liber V',
    label: 'フロンティア',
    description: 'Sandbox、Agent Teams、クラウド、Agent SDK。Claude Code の最前線を見渡す。',
  },
];