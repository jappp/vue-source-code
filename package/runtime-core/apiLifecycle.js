const onBeforeMount = createHook('bm' /* BEFORE_MOUNT */) 
const onMounted = createHook('m' /* MOUNTED */) 
const onBeforeUpdate = createHook('bu' /* BEFORE_UPDATE */) 
const onUpdated = createHook('u' /* UPDATED */) 
const onBeforeUnmount = createHook('bum' /* BEFORE_UNMOUNT */) 
const onUnmounted = createHook('um' /* UNMOUNTED */) 
const onRenderTriggered = createHook('rtg' /* RENDER_TRIGGERED */) 
const onRenderTracked = createHook('rtc' /* RENDER_TRACKED */) 
const onErrorCaptured = (hook, target = currentInstance) => { 
  injectHook('ec' /* ERROR_CAPTURED */, hook, target) 
}

const createHook = function(lifecycle)  { 
  return function (hook, target = currentInstance) { 
    injectHook(lifecycle, hook, target) 
  } 
}

function injectHook(type, hook, target = currentInstance, prepend = false) { 
  const hooks = target[type] || (target[type] = []) 
  // 封装 hook 钩子函数并缓存 
  const wrappedHook = hook.__weh || 
    (hook.__weh = (...args) => { 
      if (target.isUnmounted) { 
        return 
      } 
      // 停止依赖收集 
      pauseTracking() 
      // 设置 target 为当前运行的组件实例 
      setCurrentInstance(target) 
      // 执行钩子函数 
      const res = callWithAsyncErrorHandling(hook, target, type, args) 
      setCurrentInstance(null) 
      // 恢复依赖收集 
      resetTracking() 
      return res 
    }) 
  if (prepend) { 
    hooks.unshift(wrappedHook) 
  } 
  else { 
    hooks.push(wrappedHook) 
  } 
}

const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => { 
  // 创建响应式的副作用渲染函数 
  instance.update = effect(function componentEffect() { 
    if (!instance.isMounted) { 
      // 获取组件实例上通过 onBeforeMount 钩子函数和 onMounted 注册的钩子函数 
      const { bm, m } = instance; 
      // 渲染组件生成子树 vnode 
      const subTree = (instance.subTree = renderComponentRoot(instance)) 
      // 执行 beforemount 钩子函数 
      if (bm) { 
        invokeArrayFns(bm) 
      } 
      // 把子树 vnode 挂载到 container 中 
      patch(null, subTree, container, anchor, instance, parentSuspense, isSVG) 
      // 保留渲染生成的子树根 DOM 节点 
      initialVNode.el = subTree.el 
      // 执行 mounted 钩子函数 
      if (m) { 
        queuePostRenderEffect(m, parentSuspense) 
      } 
      instance.isMounted = true 
    } 
    else { 
      // 更新组件 
    } 
  }, prodEffectOptions) 
}

const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => { 
  // 创建响应式的副作用渲染函数 
  instance.update = effect(function componentEffect() { 
    if (!instance.isMounted) { 
      // 渲染组件 
    } 
    else { 
      // 更新组件 
      // 获取组件实例上通过 onBeforeUpdate 钩子函数和 onUpdated 注册的钩子函数 
      let { next, vnode, bu, u } = instance 
      // next 表示新的组件 vnode 
      if (next) { 
        // 更新组件 vnode 节点信息 
        updateComponentPreRender(instance, next, optimized) 
      } 
      else { 
        next = vnode 
      } 
      // 渲染新的子树 vnode 
      const nextTree = renderComponentRoot(instance) 
      // 缓存旧的子树 vnode 
      const prevTree = instance.subTree 
      // 更新子树 vnode 
      instance.subTree = nextTree 
      // 执行 beforeUpdate 钩子函数 
      if (bu) { 
        invokeArrayFns(bu) 
      } 
      // 组件更新核心逻辑，根据新旧子树 vnode 做 patch 
      patch(prevTree, nextTree, 
 // 如果在 teleport 组件中父节点可能已经改变，所以容器直接找旧树 DOM 元素的父节点 
        hostParentNode(prevTree.el), 
   // 缓存更新后的 DOM 节点 
        getNextHostNode(prevTree), 
        instance, 
        parentSuspense, 
        isSVG) 
      // 缓存更新后的 DOM 节点 
      next.el = nextTree.el 
      // 执行 updated 钩子函数 
      if (u) { 
        queuePostRenderEffect(u, parentSuspense) 
      } 
    } 
  }, prodEffectOptions) 
}

const unmountComponent = (instance, parentSuspense, doRemove) => { 
  const { bum, effects, update, subTree, um } = instance 
  // 执行 beforeUnmount 钩子函数 
  if (bum) { 
    invokeArrayFns(bum) 
  } 
  // 清理组件引用的 effects 副作用函数 
  if (effects) { 
    for (let i = 0; i < effects.length; i++) { 
      stop(effects[i]) 
    } 
  } 
  // 如果一个异步组件在加载前就销毁了，则不会注册副作用渲染函数 
  if (update) { 
    stop(update) 
    // 调用 unmount 销毁子树 
    unmount(subTree, instance, parentSuspense, doRemove) 
  } 
  // 执行 unmounted 钩子函数 
  if (um) { 
    queuePostRenderEffect(um, parentSuspense) 
  } 
}

function handleError(err, instance, type) { 
  const contextVNode = instance ? instance.vnode : null 
  if (instance) { 
    let cur = instance.parent 
    // 为了兼容 2.x 版本，暴露组件实例给钩子函数 
    const exposedInstance = instance.proxy 
    // 获取错误信息 
    const errorInfo = (process.env.NODE_ENV !== 'production') ? ErrorTypeStrings[type] : type 
    // 尝试向上查找所有父组件，执行 errorCaptured 钩子函数 
    while (cur) { 
      const errorCapturedHooks = cur.ec 
      if (errorCapturedHooks) { 
        for (let i = 0; i < errorCapturedHooks.length; i++) { 
          // 如果执行的 errorCaptured 钩子函数并返回 true，则停止向上查找。、 
          if (errorCapturedHooks[i](err, exposedInstance, errorInfo)) { 
            return 
          } 
        } 
      } 
      cur = cur.parent 
    } 
  } 
  // 往控制台输出未处理的错误 
  logError(err, type, contextVNode) 
}

function track(target, type, key) { 
  // 执行一些依赖收集的操作 
  if (!dep.has(activeEffect)) { 
    dep.add(activeEffect) 
    activeEffect.deps.push(dep) 
    if ((process.env.NODE_ENV !== 'production') && activeEffect.options.onTrack) { 
      // 执行 onTrack 函数 
      activeEffect.options.onTrack({ 
        effect: activeEffect, 
        target, 
        type, 
        key 
      }) 
    } 
  } 
}

function trigger (target, type, key, newValue) { 
  // 添加要运行的 effects 集合 
  const run = (effect) => { 
    if ((process.env.NODE_ENV !== 'production') && effect.options.onTrigger) { 
        // 执行 onTrigger 
      effect.options.onTrigger({ 
        effect, 
        target, 
        key, 
        type, 
        newValue, 
        oldValue, 
        oldTarget 
      }) 
    } 
    if (effect.options.scheduler) { 
      effect.options.scheduler(effect) 
    } 
    else { 
      effect() 
    } 
  } 
  // 遍历执行 effects 
  effects.forEach(run) 
}
