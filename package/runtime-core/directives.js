function createApp(rootComponent, rootProps = null) {
  const context = createAppContext()
  const app = {
    _component: rootComponent,
    _props: rootProps,
    directive(name, directive) {
      if ((process.env.NODE_ENV !== 'production')) {
        validateDirectiveName(name)
      }
      if (!directive) {
        // 没有第二个参数，则获取对应的指令对象
        return context.directives[name]
      }
      if ((process.env.NODE_ENV !== 'production') && context.directives[name]) {
        // 重复注册的警告
        warn(`Directive "${name}" has already been registered in target app.`)
      }
      context.directives[name] = directive
      return app
    }
  }
  return app
}

const DIRECTIVES = 'directives';
function resolveDirective(name) {
  return resolveAsset(DIRECTIVES, name)
}
function resolveAsset(type, name, warnMissing = true) {
  // 获取当前渲染实例
  const instance = currentRenderingInstance || currentInstance
  if (instance) {
    const Component = instance.type
    const res =
      // 局部注册
      resolve(Component[type], name) ||
      // 全局注册
      resolve(instance.appContext[type], name)
    if ((process.env.NODE_ENV !== 'production') && warnMissing && !res) {
      warn(`Failed to resolve ${type.slice(0, -1)}: ${name}`)
    }
    return res
  }
  else if ((process.env.NODE_ENV !== 'production')) {
    warn(`resolve${capitalize(type.slice(0, -1))} ` +
      `can only be used in render() or setup().`)
  }
}
function resolve(registry, name) {
  return (registry &&
    (registry[name] ||
      registry[camelize(name)] ||
      registry[capitalize(camelize(name))]))
}

function withDirectives(vnode, directives) {
  const internalInstance = currentRenderingInstance
  if (internalInstance === null) {
    (process.env.NODE_ENV !== 'production') && warn(`withDirectives can only be used inside render functions.`)
    return vnode
  }
  const instance = internalInstance.proxy
  const bindings = vnode.dirs || (vnode.dirs = [])
  for (let i = 0; i < directives.length; i++) {
    let [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i]
    if (isFunction(dir)) {
      dir = {
        mounted: dir,
        updated: dir
      }
    }
    bindings.push({
      dir,
      instance,
      value,
      oldValue: void 0,
      arg,
      modifiers
    })
  }
  return vnode
}
