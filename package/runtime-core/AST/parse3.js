const transformText = (node, context) => {

  if (node.type === 0 /* ROOT */ ||

    node.type === 1 /* ELEMENT */ ||

    node.type === 11 /* FOR */ ||

    node.type === 10 /* IF_BRANCH */) {

    // 在节点退出时执行转换，保证所有表达式都已经被处理

    return () => {

      const children = node.children

      let currentContainer = undefined

      let hasText = false

      // 将相邻文本节点合并

      for (let i = 0; i < children.length; i++) {

        const child = children[i]

        if (isText(child)) {

          hasText = true

          for (let j = i + 1; j < children.length; j++) {

            const next = children[j]

            if (isText(next)) {

              if (!currentContainer) {

                // 创建复合表达式节点

                currentContainer = children[i] = {

                  type: 8 /* COMPOUND_EXPRESSION */,

                  loc: child.loc,

                  children: [child]

                }

              }

              currentContainer.children.push(` + `, next)

              children.splice(j, 1)

              j--

            }

            else {

              currentContainer = undefined

              break

            }

          }

        }

      }

      if (!hasText ||

        // 如果是一个带有单个文本子元素的纯元素节点，什么都不需要转换，因为这种情况在运行时可以直接设置元素的 textContent 来更新文本。

        (children.length === 1 &&

          (node.type === 0 /* ROOT */ ||

            (node.type === 1 /* ELEMENT */ &&

              node.tagType === 0 /* ELEMENT */)))) {

        return

      }

      // 为子文本节点创建一个调用函数表达式的代码生成节点

      for (let i = 0; i < children.length; i++) {

        const child = children[i]

        if (isText(child) || child.type === 8 /* COMPOUND_EXPRESSION */) {

          const callArgs = []

          // 为 createTextVNode 添加执行参数

          if (child.type !== 2 /* TEXT */ || child.content !== ' ') {

            callArgs.push(child)

          }

          // 标记动态文本

          if (!context.ssr && child.type !== 2 /* TEXT */) {

            callArgs.push(`${1 /* TEXT */} /* ${PatchFlagNames[1 /* TEXT */]} */`)

          }

          children[i] = {

            type: 12 /* TEXT_CALL */,

            content: child,

            loc: child.loc,

            codegenNode: createCallExpression(context.helper(CREATE_TEXT), callArgs)

          }

        }

      }

    }

  }

}
