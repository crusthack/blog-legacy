import { visit } from 'unist-util-visit';

/** rehype-pretty-code 가 생성한 figcaption 제목을 pre[data-title] 에도 주입한다.
 *  CodeBlock 컴포넌트에서 data-title 을 읽어 파일명 헤더를 렌더링할 때 사용.
 */
export function rehypeInjectTitle() {
  return (tree: any) => {
    visit(tree, 'element', (node: any) => {
      if (
        node.tagName === 'figure' &&
        node.properties?.['data-rehype-pretty-code-figure'] !== undefined
      ) {
        const figcaption = node.children?.find(
          (child: any) => child.tagName === 'figcaption'
        );
        const pre = node.children?.find(
          (child: any) => child.tagName === 'pre'
        );
        const title = figcaption?.children?.[0]?.value;

        if (title && pre) {
          pre.properties = pre.properties || {};
          pre.properties['data-title'] = title;
        }
      }
    });
  };
}
