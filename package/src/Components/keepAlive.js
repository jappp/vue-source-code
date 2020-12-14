const KeepAliveImpl = {

  name: `KeepAlive`,

  __isKeepAlive: true,

  inheritRef: true,

  props: {

    include: [String, RegExp, Array],

    exclude: [String, RegExp, Array],

    max: [String, Number]

  },

  setup(props, { slots }) {

    const cache = new Map()

    const keys = new Set()

    let current = null

    const instance = getCurrentInstance()

    const parentSuspense = instance.suspense

    const sharedContext = instance.ctx

    const { renderer: { p: patch, m: move, um: _unmount, o: { createElement } } } = sharedContext

    const storageContainer = createElement('div')

    sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {

      const instance = vnode.component

      move(vnode, container, anchor, 0 /* ENTER */, parentSuspense)

      patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, isSVG, optimized)

      queuePostRenderEffect(() => {

        instance.isDeactivated = false

        if (instance.a) {

          invokeArrayFns(instance.a)

        }

        const vnodeHook = vnode.props && vnode.props.onVnodeMounted

        if (vnodeHook) {

          invokeVNodeHook(vnodeHook, instance.parent, vnode)

        }

      }, parentSuspense)

    }

    sharedContext.deactivate = (vnode) => {

      const instance = vnode.component

      move(vnode, storageContainer, null, 1 /* LEAVE */, parentSuspense)

      queuePostRenderEffect(() => {

        if (instance.da) {

          invokeArrayFns(instance.da)

        }

        const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted

        if (vnodeHook) {

          invokeVNodeHook(vnodeHook, instance.parent, vnode)

        }

        instance.isDeactivated = true

      }, parentSuspense)

    }

    function unmount(vnode) {

      resetShapeFlag(vnode)

      _unmount(vnode, instance, parentSuspense)

    }

    function pruneCache(filter) {

      cache.forEach((vnode, key) => {

        const name = getName(vnode.type)

        if (name && (!filter || !filter(name))) {

          pruneCacheEntry(key)

        }

      })

    }

    function pruneCacheEntry(key) {

      const cached = cache.get(key)

      if (!current || cached.type !== current.type) {

        unmount(cached)

      }

      else if (current) {

        resetShapeFlag(current)

      }

      cache.delete(key)

      keys.delete(key)

    }

    watch(() => [props.include, props.exclude], ([include, exclude]) => {

      include && pruneCache(name => matches(include, name))

      exclude && !pruneCache(name => matches(exclude, name))

    })

    let pendingCacheKey = null

    const cacheSubtree = () => {

      if (pendingCacheKey != null) {

        cache.set(pendingCacheKey, instance.subTree)

      }

    }

    onBeforeMount(cacheSubtree)

    onBeforeUpdate(cacheSubtree)

    onBeforeUnmount(() => {

      cache.forEach(cached => {

        const { subTree, suspense } = instance

        if (cached.type === subTree.type) {

          resetShapeFlag(subTree)

          const da = subTree.component.da

          da && queuePostRenderEffect(da, suspense)

          return

        }

        unmount(cached)

      })

    })

    return () => {

      pendingCacheKey = null

      if (!slots.default) {

        return null

      }

      const children = slots.default()

      let vnode = children[0]

      if (children.length > 1) {

        if ((process.env.NODE_ENV !== 'production')) {

          warn(`KeepAlive should contain exactly one component child.`)

        }

        current = null

        return children

      }

      else if (!isVNode(vnode) ||

        !(vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */)) {

        current = null

        return vnode

      }

      const comp = vnode.type

      const name = getName(comp)

      const { include, exclude, max } = props

      if ((include && (!name || !matches(include, name))) ||

        (exclude && name && matches(exclude, name))) {

        return (current = vnode)

      }

      const key = vnode.key == null ? comp : vnode.key

      const cachedVNode = cache.get(key)

      if (vnode.el) {

        vnode = cloneVNode(vnode)

      }

      pendingCacheKey = key

      if (cachedVNode) {

        vnode.el = cachedVNode.el

        vnode.component = cachedVNode.component

        vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */

        keys.delete(key)

        keys.add(key)

      }

      else {

        keys.add(key)

        if (max && keys.size > parseInt(max, 10)) {

          pruneCacheEntry(keys.values().next().value)

        }

      }

      vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */

      current = vnode

      return vnode

    }

  }

}


// 组件的渲染部分
return () => {
  pendingCacheKey = null
  if (!slots.default) {
    return null
  }
  const children = slots.default()
  let vnode = children[0]
  if (children.length > 1) {
    if ((process.env.NODE_ENV !== 'production')) {
      warn(`KeepAlive should contain exactly one component child.`)
    }
    current = null
    return children
  }
  else if (!isVNode(vnode) ||
    !(vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */)) {
    current = null
    return vnode
  }
  const comp = vnode.type
  const name = getName(comp)
  const { include, exclude, max } = props
  if ((include && (!name || !matches(include, name))) ||
    (exclude && name && matches(exclude, name))) {
    return (current = vnode)
  }
  const key = vnode.key == null ? comp : vnode.key
  const cachedVNode = cache.get(key)
  if (vnode.el) {
    vnode = cloneVNode(vnode)
  }
  pendingCacheKey = key
  if (cachedVNode) {
    vnode.el = cachedVNode.el
    vnode.component = cachedVNode.component
    // 避免 vnode 节点作为新节点被挂载
    vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */
    // 让这个 key 始终新鲜
    keys.delete(key)
    keys.add(key)
  }
  else {
    keys.add(key)
    // 删除最久不用的 key，符合 LRU 思想
    if (max && keys.size > parseInt(max, 10)) {
      pruneCacheEntry(keys.values().next().value)
    }
  }
  // 避免 vnode 被卸载
  vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */
  current = vnode
  return vnode
}
