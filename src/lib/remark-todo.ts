import type { Root, Text } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const TODO_PATTERN = /\[TODO::([^\]]*)\]/g;

const remarkTodo: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const matches = [...node.value.matchAll(TODO_PATTERN)];
      if (matches.length === 0) return;

      const children: (Text | { type: 'html'; value: string })[] = [];
      let lastEnd = 0;

      for (const match of matches) {
        const start = match.index!;
        const label = match[1].trim();

        if (start > lastEnd) {
          children.push({ type: 'text', value: node.value.slice(lastEnd, start) });
        }

        const content = label
          ? `<span class="todo-marker" role="note"><span class="todo-label">TODO</span> ${label}</span>`
          : `<span class="todo-marker" role="note"><span class="todo-label">TODO</span></span>`;

        children.push({ type: 'html', value: content });
        lastEnd = start + match[0].length;
      }

      if (lastEnd < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastEnd) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
};

export default remarkTodo;
