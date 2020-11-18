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

function parseChildren(context, mode, ancestors) { 

  const parent = last(ancestors) 

  const ns = parent ? parent.ns : 0 /* HTML */ 

  const nodes = [] 

  // 自顶向下分析代码，生成 nodes 

  let removedWhitespace = false 

  // 空白字符管理 

  return removedWhitespace ? nodes.filter(Boolean) : nodes 

} 

function parseChildren(context, mode, ancestors) { 

  // 父节点 

  const parent = last(ancestors) 

  const ns = parent ? parent.ns : 0 /* HTML */ 

  const nodes = [] 

  // 判断是否遍历结束 

  while (!isEnd(context, mode, ancestors)) { 

    const s = context.source 

    let node = undefined 

    if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) { 

      if (!context.inVPre && startsWith(s, context.options.delimiters[0])) { 

        // 处理 {{ 插值代码 

        node = parseInterpolation(context, mode) 

      } 

      else if (mode === 0 /* DATA */ && s[0] === '<') { 

        // 处理 < 开头的代码 

        if (s.length === 1) { 

          // s 长度为 1，说明代码结尾是 <，报错 

          emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 1) 

        } 

        else if (s[1] === '!') { 

          // 处理 <! 开头的代码 

          if (startsWith(s, '<!--')) { 

            // 处理注释节点 

            node = parseComment(context) 

          } 

          else if (startsWith(s, '<!DOCTYPE')) { 

            // 处理 <!DOCTYPE 节点 

            node = parseBogusComment(context) 

          } 

          else if (startsWith(s, '<![CDATA[')) { 

            // 处理 <![CDATA[ 节点 

            if (ns !== 0 /* HTML */) { 

              node = parseCDATA(context, ancestors) 

            } 

            else { 

              emitError(context, 1 /* CDATA_IN_HTML_CONTENT */) 

              node = parseBogusComment(context) 

            } 

          } 

          else { 

            emitError(context, 11 /* INCORRECTLY_OPENED_COMMENT */) 

            node = parseBogusComment(context) 

          } 

        } 

        else if (s[1] === '/') { 

          // 处理 </ 结束标签 

          if (s.length === 2) { 

            // s 长度为 2，说明代码结尾是 </，报错 

            emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 2) 

          } 

          else if (s[2] === '>') { 

            // </> 缺少结束标签，报错 

            emitError(context, 14 /* MISSING_END_TAG_NAME */, 2) 

            advanceBy(context, 3) 

            continue 

          } 

          else if (/[a-z]/i.test(s[2])) { 

            // 多余的结束标签 

            emitError(context, 23 /* X_INVALID_END_TAG */) 

            parseTag(context, 1 /* End */, parent) 

            continue 

          } 

          else { 

            emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 2) 

            node = parseBogusComment(context) 

          } 

        } 

        else if (/[a-z]/i.test(s[1])) { 

          // 解析标签元素节点 

          node = parseElement(context, ancestors) 

        } 

        else if (s[1] === '?') { 

          emitError(context, 21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */, 1) 

          node = parseBogusComment(context) 

        } 

        else { 

          emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 1) 

        } 

      } 

    } 

    if (!node) { 

      // 解析普通文本节点 

      node = parseText(context, mode) 

    } 

    if (isArray(node)) { 

      // 如果 node 是数组，则遍历添加 

      for (let i = 0; i < node.length; i++) { 

        pushNode(nodes, node[i]) 

      } 

    } 

    else { 

      // 添加单个 node 

      pushNode(nodes, node) 

    } 

  } 

} 



