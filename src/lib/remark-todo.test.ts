import { describe, it, expect } from 'bun:test';
import type { Root, Text, Paragraph } from 'mdast';
import remarkTodo from './remark-todo';

function makeTree(text: string): Root {
  return {
    type: 'root',
    children: [{
      type: 'paragraph',
      children: [{ type: 'text', value: text }],
    }],
  };
}

function getChildren(tree: Root) {
  return (tree.children[0] as Paragraph).children;
}

function run(text: string): Root {
  const tree = makeTree(text);
  const transform = (remarkTodo as unknown as () => (tree: Root) => void)();
  transform(tree);
  return tree;
}

describe('remarkTodo', () => {
  it('converts TODO with label to span', () => {
    const tree = run('[TODO::fix this]');
    const children = getChildren(tree);
    expect(children).toHaveLength(1);
    expect(children[0]).toEqual({
      type: 'html',
      value: '<span class="todo-marker" role="note"><span class="todo-label">TODO</span> fix this</span>',
    });
  });

  it('converts TODO without label', () => {
    const tree = run('[TODO::]');
    const children = getChildren(tree);
    expect(children).toHaveLength(1);
    expect(children[0]).toEqual({
      type: 'html',
      value: '<span class="todo-marker" role="note"><span class="todo-label">TODO</span></span>',
    });
  });

  it('handles multiple TODOs in one text node', () => {
    const tree = run('[TODO::a] and [TODO::b]');
    const children = getChildren(tree);
    expect(children).toHaveLength(3);
    expect(children[0]).toHaveProperty('type', 'html');
    expect(children[1]).toEqual({ type: 'text', value: ' and ' });
    expect(children[2]).toHaveProperty('type', 'html');
  });

  it('leaves plain text unchanged', () => {
    const tree = run('no todos here');
    const children = getChildren(tree);
    expect(children).toHaveLength(1);
    expect((children[0] as Text).value).toBe('no todos here');
  });

  it('preserves surrounding text', () => {
    const tree = run('before [TODO::x] after');
    const children = getChildren(tree);
    expect(children).toHaveLength(3);
    expect(children[0]).toEqual({ type: 'text', value: 'before ' });
    expect(children[2]).toEqual({ type: 'text', value: ' after' });
  });
});
