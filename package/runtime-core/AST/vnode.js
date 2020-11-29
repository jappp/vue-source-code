// 生成创建 VNode 树的表达式
if (ast.codegenNode) {
  genNode(ast.codegenNode, context);
}
else {
  push(`null`);
}


function genNode(node, context) {
  if (shared.isString(node)) {
    context.push(node)
    return
  }
  if (shared.isSymbol(node)) {
    context.push(context.helper(node))
    return
  }
  switch (node.type) {
    case 1 /* ELEMENT */:
    case 9 /* IF */:
    case 11 /* FOR */:
      genNode(node.codegenNode, context)
      break
    case 2 /* TEXT */:
      genText(node, context)
      break
    case 4 /* SIMPLE_EXPRESSION */:
      genExpression(node, context)
      break
    case 5 /* INTERPOLATION */:
      genInterpolation(node, context)
      break
    case 12 /* TEXT_CALL */:
      genNode(node.codegenNode, context)
      break
    case 8 /* COMPOUND_EXPRESSION */:
      genCompoundExpression(node, context)
      break
    case 3 /* COMMENT */:
      break
    case 13 /* VNODE_CALL */:
      genVNodeCall(node, context)
      break
    case 14 /* JS_CALL_EXPRESSION */:
      genCallExpression(node, context)
      break
    case 15 /* JS_OBJECT_EXPRESSION */:
      genObjectExpression(node, context)
      break
    case 17 /* JS_ARRAY_EXPRESSION */:
      genArrayExpression(node, context)
      break
    case 18 /* JS_FUNCTION_EXPRESSION */:
      genFunctionExpression(node, context)
      break
    case 19 /* JS_CONDITIONAL_EXPRESSION */:
      genConditionalExpression(node, context)
      break
    case 20 /* JS_CACHE_EXPRESSION */:
      genCacheExpression(node, context)
      break
    // SSR only types
    case 21 /* JS_BLOCK_STATEMENT */:
      genNodeList(node.body, context, true, false)
      break
    case 22 /* JS_TEMPLATE_LITERAL */:
      genTemplateLiteral(node, context)
      break
    case 23 /* JS_IF_STATEMENT */:
      genIfStatement(node, context)
      break
    case 24 /* JS_ASSIGNMENT_EXPRESSION */:
      genAssignmentExpression(node, context)
      break
    case 25 /* JS_SEQUENCE_EXPRESSION */:
      genSequenceExpression(node, context)
      break
    case 26 /* JS_RETURN_STATEMENT */:
      genReturnStatement(node, context)
      break
  }
}

function genVNodeCall(node, context) {
  const { push, helper, pure } = context
  const { tag, props, children, patchFlag, dynamicProps, directives, isBlock, disableTracking } = node
  if (directives) {
    push(helper(WITH_DIRECTIVES) + `(`)
  }
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(${disableTracking ? `true` : ``}), `)
  }
  if (pure) {
    push(PURE_ANNOTATION)
  }
  push(helper(isBlock ? CREATE_BLOCK : CREATE_VNODE) + `(`, node)
  genNodeList(genNullableArgs([tag, props, children, patchFlag, dynamicProps]), context)
  push(`)`)
  if (isBlock) {
    push(`)`)
  }
  if (directives) {
    push(`, `)
    genNode(directives, context)
    push(`)`)
  }
}

function genNullableArgs(args) {
  let i = args.length
  while (i--) {
    if (args[i] != null)
      break
  }
  return args.slice(0, i + 1).map(arg => arg || `null`)
}

function genNodeList(nodes, context, multilines = false, comma = true) {
  const { push, newline } = context
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if (shared.isString(node)) {
      push(node)
    }
    else if (shared.isArray(node)) {
      genNodeListAsArray(node, context)
    }
    else {
      genNode(node, context)
    }
    if (i < nodes.length - 1) {
      if (multilines) {
        comma && push(',')
        newline()
      }
      else {
        comma && push(', ')
      }
    }
  }
}

function genExpression(node, context) {
  const { content, isStatic } = node
  context.push(isStatic ? JSON.stringify(content) : content, node)
}

function genNodeListAsArray(nodes, context) {
  const multilines = nodes.length > 3 || nodes.some(n => isArray(n) || !isText$1(n))
  context.push(`[`)
  multilines && context.indent()
  genNodeList(nodes, context, multilines);
  multilines && context.deindent()
  context.push(`]`)
}

function genConditionalExpression(node, context) {
  const { test, consequent, alternate, newline: needNewline } = node
  const { push, indent, deindent, newline } = context
  // 生成条件表达式
  if (test.type === 4 /* SIMPLE_EXPRESSION */) {
    const needsParens = !isSimpleIdentifier(test.content)
    needsParens && push(`(`)
    genExpression(test, context)
    needsParens && push(`)`)
  }
  else {
    push(`(`)
    genNode(test, context)
    push(`)`)
  }
  // 换行加缩进
  needNewline && indent()
  context.indentLevel++
  needNewline || push(` `)
  // 生成主逻辑代码
  push(`? `)
  genNode(consequent, context)
  context.indentLevel--
  needNewline && newline()
  needNewline || push(` `)
  // 生成备选逻辑代码
  push(`: `)
  const isNested = alternate.type === 19 /* JS_CONDITIONAL_EXPRESSION */
  if (!isNested) {
    context.indentLevel++
  }
  genNode(alternate, context)
  if (!isNested) {
    context.indentLevel--
  }
  needNewline && deindent(true /* without newline */)
}

function createVNode(type, props = null
  ,children = null) {
    // 处理 props 相关逻辑，标准化 class 和 style
    // 对 vnode 类型信息编码 
    // 创建 vnode 对象
    // 标准化子节点，把不同数据类型的 children 转成数组或者文本类型。
    // 添加动态 vnode 节点到 currentBlock 中
    if (shouldTrack > 0 &&
      !isBlockNode &&
      currentBlock &&
      patchFlag !== 32 /* HYDRATE_EVENTS */ &&
      (patchFlag > 0 ||
        shapeFlag & 128 /* SUSPENSE */ ||
        shapeFlag & 64 /* TELEPORT */ ||
        shapeFlag & 4 /* STATEFUL_COMPONENT */ ||
        shapeFlag & 2 /* FUNCTIONAL_COMPONENT */)) {
      currentBlock.push(vnode);
    }
    return vnode
  }

  function createBlock(type, props, children, patchFlag, dynamicProps) {
    const vnode = createVNode(type, props, children, patchFlag, dynamicProps, true /* isBlock: 阻止这个 block 收集自身 */)
    // 在 vnode 上保留当前 Block 收集的动态子节点
    vnode.dynamicChildren = currentBlock || EMPTY_ARR
    blockStack.pop()
    // 当前 Block 恢复到父 Block
    currentBlock = blockStack[blockStack.length - 1] || null
    // 节点本身作为父 Block 收集的子节点
    if (currentBlock) {
      currentBlock.push(vnode)
    }
    return vnode
  }

  const patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, isSVG) => {
    for (let i = 0; i < newChildren.length; i++) {
      const oldVNode = oldChildren[i]
      const newVNode = newChildren[i]
      // 确定待更新节点的容器
      const container =
        // 对于 Fragment，我们需要提供正确的父容器
        oldVNode.type === Fragment ||
        // 在不同节点的情况下，将有一个替换节点，我们也需要正确的父容器
        !isSameVNodeType(oldVNode, newVNode) ||
        // 组件的情况，我们也需要提供一个父容器
        oldVNode.shapeFlag & 6 /* COMPONENT */
          ? hostParentNode(oldVNode.el)
          :
          // 在其他情况下，父容器实际上并没有被使用，所以这里只传递 Block 元素即可
          fallbackContainer
      patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, true)
    }
  }
  

