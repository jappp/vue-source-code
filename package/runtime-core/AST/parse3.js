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

function createCallExpression(callee, args = [], loc = locStub) {

  return {

    type: 14 /* JS_CALL_EXPRESSION */,

    loc,

    callee,

    arguments: args

  }

}

// v-if 节点转换函数的实现
const transformIf = createStructuralDirectiveTransform(/^(if|else|else-if)$/, (node, dir, context) => {

  return processIf(node, dir, context, (ifNode, branch, isRoot) => {

    return () => {

      // 退出回调函数，当所有子节点转换完成执行

    }

  })

})

function createStructuralDirectiveTransform(name, fn) {

  const matches = isString(name)

    ? (n) => n === name

    : (n) => name.test(n)

  return (node, context) => {

    // 只处理元素节点

    if (node.type === 1 /* ELEMENT */) {

      const { props } = node

      // 结构化指令的转换与插槽无关，插槽相关处理逻辑在 vSlot.ts 中

      if (node.tagType === 3 /* TEMPLATE */ && props.some(isVSlot)) {

        return

      }

      const exitFns = []

      for (let i = 0; i < props.length; i++) {

        const prop = props[i]

        if (prop.type === 7 /* DIRECTIVE */ && matches(prop.name)) {

          // 删除结构指令以避免无限递归

          props.splice(i, 1)

          i--

          const onExit = fn(node, prop, context)

          if (onExit)

            exitFns.push(onExit)

        }

      }

      return exitFns

    }

  }

}


