const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, isSVG = false, optimized = false) => {
  if (n1 && !isSameVNodeType(n1, n2)) {
    // 如果存在新旧节点, 且新旧节点类型不同，则销毁旧节点
  }
  const { type, shapeFlag } = n2
  switch (type) {
    case Text:
      // 处理文本节点
      break
    case Comment:
      // 处理注释节点
      break
    case Static:
      // 处理静态节点
      break
    case Fragment:
      // 处理 Fragment 元素
      break
    default:
      if (shapeFlag & 1 /* ELEMENT */) {
        // 处理普通 DOM 元素
      }
      else if (shapeFlag & 6 /* COMPONENT */) {
        // 处理组件
      }
      else if (shapeFlag & 64 /* TELEPORT */) {
        // 处理 TELEPORT
        type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, internals);
      }
      else if (shapeFlag & 128 /* SUSPENSE */) {
        // 处理 SUSPENSE
      }
  }
}

function process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, internals) {
  const { mc: mountChildren, pc: patchChildren, pbc: patchBlockChildren, o: { insert, querySelector, createText, createComment } } = internals
  const disabled = isTeleportDisabled(n2.props)
  const { shapeFlag, children } = n2
  if (n1 == null) {
    // 在主视图里插入注释节点或者空白文本节点
    const placeholder = (n2.el = (process.env.NODE_ENV !== 'production')
      ? createComment('teleport start')
      : createText(''))
    const mainAnchor = (n2.anchor = (process.env.NODE_ENV !== 'production')
      ? createComment('teleport end')
      : createText(''))
    insert(placeholder, container, anchor)
    insert(mainAnchor, container, anchor)
    // 获取目标移动的 DOM 节点
    const target = (n2.target = resolveTarget(n2.props, querySelector))
    const targetAnchor = (n2.targetAnchor = createText(''))
    if (target) {
      insert(targetAnchor, target)
    }
    else if ((process.env.NODE_ENV !== 'production')) {
      // 查找不到 target 则报警告
      warn('Invalid Teleport target on mount:', target, `(${typeof target})`)
    }
    const mount = (container, anchor) => {
      if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
        // 挂载子节点
        mountChildren(children, container, anchor, parentComponent, parentSuspense, isSVG, optimized)
      }
    }
    if (disabled) {
      // disabled 情况就在原先的位置挂载
      mount(container, mainAnchor)
    }
    else if (target) {
      // 挂载到 target 的位置
      mount(target, targetAnchor)
    }
  } else {
    n2.el = n1.el
    const mainAnchor = (n2.anchor = n1.anchor)
    const target = (n2.target = n1.target)
    const targetAnchor = (n2.targetAnchor = n1.targetAnchor)
    // 之前是不是 disabled 状态
    const wasDisabled = isTeleportDisabled(n1.props)
    const currentContainer = wasDisabled ? container : target
    const currentAnchor = wasDisabled ? mainAnchor : targetAnchor
    // 更新子节点
    if (n2.dynamicChildren) {
      patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren, currentContainer, parentComponent, parentSuspense, isSVG)
      if (n2.shapeFlag & 16 /* ARRAY_CHILDREN */) {
        const oldChildren = n1.children
        const children = n2.children
        for (let i = 0; i < children.length; i++) {
          if (!children[i].el) {
            children[i].el = oldChildren[i].el
          }
        }
      }
    }
    else if (!optimized) {
      patchChildren(n1, n2, currentContainer, currentAnchor, parentComponent, parentSuspense, isSVG)
    }
    if (disabled) {
      if (!wasDisabled) {
        // enabled -> disabled
        // 把子节点移动回主容器
        moveTeleport(n2, container, mainAnchor, internals, 1 /* TOGGLE */)
      }
    }
    else {
      if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
        // 目标元素改变
        const nextTarget = (n2.target = resolveTarget(n2.props, querySelector))
        if (nextTarget) {
          // 移动到新的目标元素
          moveTeleport(n2, nextTarget, null, internals, 0 /* TARGET_CHANGE */)
        }
        else if ((process.env.NODE_ENV !== 'production')) {
          warn('Invalid Teleport target on update:', target, `(${typeof target})`)
        }
      }
      else if (wasDisabled) {
        // disabled -> enabled
        // 移动到目标元素位置
        moveTeleport(n2, target, targetAnchor, internals, 1 /* TOGGLE */)
      }
    }
  }
}

function remove(vnode, { r: remove, o: { remove: hostRemove } }) {
  const { shapeFlag, children, anchor } = vnode
  hostRemove(anchor)
  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
    for (let i = 0; i < children.length; i++) {
      remove(children[i])
    }
  }
}


