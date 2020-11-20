function compile(template, options = {}) { 
  return baseCompile(template, extend({}, parserOptions, options, { 
    nodeTransforms: [...DOMNodeTransforms, ...(options.nodeTransforms || [])], 
    directiveTransforms: extend({}, DOMDirectiveTransforms, options.directiveTransforms || {}), 
    transformHoist:  null 
  })) 
} 

function baseCompile(template,  options = {}) { 

  const prefixIdentifiers = false 

  // 解析 template 生成 AST 

  const ast = isString(template) ? baseParse(template, options) : template 

  const [nodeTransforms, directiveTransforms] = getBaseTransformPreset() 

  // AST 转换 

  transform(ast, extend({}, options, { 

    prefixIdentifiers, 

    nodeTransforms: [ 

      ...nodeTransforms, 

      ...(options.nodeTransforms || []) 

    ], 

    directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {} 

    ) 

  })) 

  // 生成代码 

  return generate(ast, extend({}, options, { 

    prefixIdentifiers 

  })) 
}     

function baseParse(content, options = {}) { 

  // 创建解析上下文 

  const context = createParserContext(content, options) 

  const start = getCursor(context) 

  // 解析子节点，并创建 AST  

  return createRoot(parseChildren(context, 0 /* DATA */, []), getSelection(context, start)) 

}

// 默认解析配置 
const defaultParserOptions = { 
  delimiters: [`{{`, `}}`], 
  getNamespace: () => 0 /* HTML */, 
  getTextMode: () => 0 /* DATA */, 
  isVoidTag: NO, 
  isPreTag: NO, 
  isCustomElement: NO, 
  decodeEntities: (rawText) => rawText.replace(decodeRE, (_, p1) => decodeMap[p1]), 
  onError: defaultOnError 
} 
function createParserContext(content, options) { 
  return { 
    options: extend({}, defaultParserOptions, options), 
    column: 1, 
    line: 1, 
    offset: 0, 
    originalSource: content, 
    source: content, 
    inPre: false, 
    inVPre: false 
  } 
}






