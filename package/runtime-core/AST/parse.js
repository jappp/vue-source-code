function parseComment(context) { 

  const start = getCursor(context) 

  let content 

  // 常规注释的结束符 

  const match = /--(\!)?>/.exec(context.source) 

  if (!match) { 

    // 没有匹配的注释结束符 

    content = context.source.slice(4) 

    advanceBy(context, context.source.length) 

    emitError(context, 7 /* EOF_IN_COMMENT */) 

  } 

  else { 

    if (match.index <= 3) { 

      // 非法的注释符号 

      emitError(context, 0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */) 

    } 

    if (match[1]) { 

      // 注释结束符不正确 

      emitError(context, 10 /* INCORRECTLY_CLOSED_COMMENT */) 

    } 

    // 获取注释的内容 

    content = context.source.slice(4, match.index) 

    // 截取到注释结尾之间的代码，用于后续判断嵌套注释 

    const s = context.source.slice(0, match.index) 

    let prevIndex = 1, nestedIndex = 0 

    // 判断嵌套注释符的情况，存在即报错 

    while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) { 

      advanceBy(context, nestedIndex - prevIndex + 1) 

      if (nestedIndex + 4 < s.length) { 

        emitError(context, 16 /* NESTED_COMMENT */) 

      } 

      prevIndex = nestedIndex + 1 

    } 

    // 前进代码到注释结束符后 

    advanceBy(context, match.index + match[0].length - prevIndex + 1) 

  } 

  return { 

    type: 3 /* COMMENT */, 

    content, 

    loc: getSelection(context, start) 

  } 

}

function advanceBy(context, numberOfCharacters) { 

  const { source } = context 

  // 更新 context 的 offset、line、column 

  advancePositionWithMutation(context, source, numberOfCharacters) 

  // 更新 context 的 source 

  context.source = source.slice(numberOfCharacters) 

} 

function advancePositionWithMutation(pos, source, numberOfCharacters = source.length) { 

  let linesCount = 0 

  let lastNewLinePos = -1 

  for (let i = 0; i < numberOfCharacters; i++) { 

    if (source.charCodeAt(i) === 10 /* newline char code */) { 

      linesCount++ 

      lastNewLinePos = i 

    } 

  } 

  pos.offset += numberOfCharacters 

  pos.line += linesCount 

  pos.column = 

    lastNewLinePos === -1 

      ? pos.column + numberOfCharacters 

      : numberOfCharacters - lastNewLinePos 

  return pos 

} 

function parseInterpolation(context, mode) { 

  // 从配置中获取插值开始和结束分隔符，默认是 {{ 和 }} 

  const [open, close] = context.options.delimiters 

  const closeIndex = context.source.indexOf(close, open.length) 

  if (closeIndex === -1) { 

    emitError(context, 25 /* X_MISSING_INTERPOLATION_END */) 

    return undefined 

  } 

  const start = getCursor(context) 

  // 代码前进到插值开始分隔符后 

  advanceBy(context, open.length) 

  // 内部插值开始位置 

  const innerStart = getCursor(context) 

  // 内部插值结束位置 

  const innerEnd = getCursor(context) 

  // 插值原始内容的长度 

  const rawContentLength = closeIndex - open.length 

  // 插值原始内容 

  const rawContent = context.source.slice(0, rawContentLength) 

  // 获取插值的内容，并前进代码到插值的内容后 

  const preTrimContent = parseTextData(context, rawContentLength, mode) 

  const content = preTrimContent.trim() 

  // 内容相对于插值开始分隔符的头偏移 

  const startOffset = preTrimContent.indexOf(content) 

  if (startOffset > 0) { 

    // 更新内部插值开始位置 

    advancePositionWithMutation(innerStart, rawContent, startOffset) 

  } 

  // 内容相对于插值结束分隔符的尾偏移 

  const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset) 

  // 更新内部插值结束位置 

  advancePositionWithMutation(innerEnd, rawContent, endOffset); 

  // 前进代码到插值结束分隔符后 

  advanceBy(context, close.length) 

  return { 

    type: 5 /* INTERPOLATION */, 

    content: { 

      type: 4 /* SIMPLE_EXPRESSION */, 

      isStatic: false, 

      isConstant: false, 

      content, 

      loc: getSelection(context, innerStart, innerEnd) 

    }, 

    loc: getSelection(context, start) 

  } 

} 

function parseText(context, mode) { 

  // 文本结束符 

  const endTokens = ['<', context.options.delimiters[0]] 

  if (mode === 3 /* CDATA */) { 

    // CDATA 标记 XML 中的纯文本 

    endTokens.push(']]>') 

  } 

  let endIndex = context.source.length 

  // 遍历文本结束符，匹配找到结束的位置 

  for (let i = 0; i < endTokens.length; i++) { 

    const index = context.source.indexOf(endTokens[i], 1) 

    if (index !== -1 && endIndex > index) { 

      endIndex = index 

    } 

  } 

  const start = getCursor(context) 

  // 获取文本的内容，并前进代码到文本的内容后 

  const content = parseTextData(context, endIndex, mode) 

  return { 

    type: 2 /* TEXT */, 

    content, 

    loc: getSelection(context, start) 

  } 

} 