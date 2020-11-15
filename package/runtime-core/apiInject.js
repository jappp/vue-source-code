function provide(key, value) { 
  let provides = currentInstance.provides 
  const parentProvides = currentInstance.parent && currentInstance.parent.provides 
  if (parentProvides === provides) { 
    provides = currentInstance.provides = Object.create(parentProvides) 
  } 
  provides[key] = value 
}

const instance = { 
  // 依赖注入相关 
  provides: parent ? parent.provides : Object.create(appContext.provides), 
  // 其它属性 
  // ... 
}

function inject(key, defaultValue) { 
  const instance = currentInstance || currentRenderingInstance 
  if (instance) { 
    const provides = instance.provides 
    if (key in provides) { 
      return provides[key] 
    } 
    else if (arguments.length > 1) { 
      return defaultValue 
    } 
    else if ((process.env.NODE_ENV !== 'production')) { 
      warn(`injection "${String(key)}" not found.`) 
    } 
  } 
}
