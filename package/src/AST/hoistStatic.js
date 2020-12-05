function hoistStatic(root, context) {

  walk(root, context, new Map(),

    // Root node is unfortunately non-hoistable due to potential parent fallthrough attributes.

    isSingleElementRoot(root, root.children[0]));

}

function walk(node, context, resultCache, doNotHoistNode = false) {

  let hasHoistedNode = false

  // 是否包含运行时常量

  let hasRuntimeConstant = false

  const { children } = node

  for (let i = 0; i < children.length; i++) {

    const child = children[i]

    // 只有普通元素和文本节点才能被静态提升

    if (child.type === 1 /* ELEMENT */ &&

      child.tagType === 0 /* ELEMENT */) {

      let staticType

      if (!doNotHoistNode &&

        // 获取静态节点的类型，如果是元素，则递归检查它的子节点

        (staticType = getStaticType(child, resultCache)) > 0) {

        if (staticType === 2 /* HAS_RUNTIME_CONSTANT */) {

          hasRuntimeConstant = true

        }

        // 更新 patchFlag

        child.codegenNode.patchFlag =

          -1 /* HOISTED */ + ((process.env.NODE_ENV !== 'production') ? ` /* HOISTED */` : ``)

        // 更新节点的 codegenNode

        child.codegenNode = context.hoist(child.codegenNode)

        hasHoistedNode = true

        continue

      }

      else {

        // 节点可能会包含一些动态子节点，但它的静态属性还是可以被静态提升

        const codegenNode = child.codegenNode

        if (codegenNode.type === 13 /* VNODE_CALL */) {

          const flag = getPatchFlag(codegenNode)

          if ((!flag ||

            flag === 512 /* NEED_PATCH */ ||

            flag === 1 /* TEXT */) &&

            !hasDynamicKeyOrRef(child) &&

            !hasCachedProps()) {

            const props = getNodeProps(child)

            if (props) {

              codegenNode.props = context.hoist(props)

            }

          }

        }

      }

    }

    else if (child.type === 12 /* TEXT_CALL */) {

      // 文本节点也可以静态提升

      const staticType = getStaticType(child.content, resultCache)

      if (staticType > 0) {

        if (staticType === 2 /* HAS_RUNTIME_CONSTANT */) {

          hasRuntimeConstant = true

        }

        child.codegenNode = context.hoist(child.codegenNode)

        hasHoistedNode = true

      }

    }

    if (child.type === 1 /* ELEMENT */) {

      // 递归遍历子节点

      walk(child, context, resultCache)

    }

    else if (child.type === 11 /* FOR */) {

      walk(child, context, resultCache, child.children.length === 1)

    }

    else if (child.type === 9 /* IF */) {

      for (let i = 0; i < child.branches.length; i++) {

        walk(child.branches[i], context, resultCache, child.branches[i].children.length === 1)

      }

    }

  }

  if (!hasRuntimeConstant && hasHoistedNode && context.transformHoist) {

    // 如果编译配置了 transformHoist，则执行

    context.transformHoist(children, context, node)

  }

}

function createRootCodegen(root, context) {

  const { helper } = context;

  const { children } = root;

  const child = children[0];

  if (children.length === 1) {

    // 如果子节点是单个元素节点，则将其转换成一个 block

    if (isSingleElementRoot(root, child) && child.codegenNode) {

      const codegenNode = child.codegenNode;

      if (codegenNode.type === 13 /* VNODE_CALL */) {

        codegenNode.isBlock = true;

        helper(OPEN_BLOCK);

        helper(CREATE_BLOCK);

      }

      root.codegenNode = codegenNode;

    }

    else {

      root.codegenNode = child;

    }

  }

  else if (children.length > 1) {

    // 如果子节点是多个节点，则返回一个 fragement 的代码生成节点

    root.codegenNode = createVNodeCall(context, helper(FRAGMENT), undefined, root.children, `${64 /* STABLE_FRAGMENT */} /* ${PatchFlagNames[64 /* STABLE_FRAGMENT */]} */`, undefined, undefined, true);

  }

}