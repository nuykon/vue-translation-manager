const fs = require('fs')
const path = require('path')
const translate = require('node-google-translate-skidz')
const execall = require('execall')
const glob = require('glob')
const uniq = require('lodash.uniq')

/**
 * Initialize the translation manager
 * @param {object} opts Options
 * @param {array} opts.languages The languages, e.g. ["en", "de"]
 * @param {object} opts.adapter Adapter for storing and accessing the translations
 * @param {string} opts.path Path to the translations
 */
function TranslationManager (opts) {
  this.languages = opts.languages || []
  if (this.languages.length === 0) throw new Error('No languages given')

  this.adapter = opts.adapter
  if (!this.adapter) throw new Error('No adapter given')

  this.srcPath = opts.srcPath || process.cwd()
  this.rootPath = opts.root || process.cwd()

  this.adapter._setLanguages(this.languages)
}

module.exports = TranslationManager

module.exports.JSONAdapter = require('./adapter-json.js')

/**
 * Get the languages configured
 * @returns {array}
 */
TranslationManager.prototype.getLanguages = function () {
  return this.languages
}

/**
 * Get the configured src path
 * @returns {string}
 */
TranslationManager.prototype.getSrcPath = function () {
  return this.srcPath
}

/**
 * Get the template part for a vue component
 * @param {string} path Path to the vue single file component, null if there is none
 * @returns {object}
 */
TranslationManager.prototype.getTemplateForSingleFileComponent = function (path) {
  const contents = fs.readFileSync(path, { encoding: 'utf8' })
  const templateResult = /<template>([\w\W]*)<\/template>/g.exec(contents)

  if (!templateResult) return null

  let template = ''
  if (templateResult && templateResult[1]) template = templateResult[1]

  return { template: template, offset: templateResult[0].indexOf(templateResult[1]) + templateResult.index }
}

/**
 * Get all untranslated strings for a given vue component
 * @param {string} pathToComponent Path to the vue component
 */
TranslationManager.prototype.getStringsForComponent = function (pathToComponent) {
  var templateResult = this.getTemplateForSingleFileComponent(pathToComponent)
  if (!templateResult) return []

  var templateOffset = templateResult.offset
  var template = templateResult.template

  var matches = execall(/>([^<>]*)</gm, template)

  function extractTemplateExpression (text) {
    const indexOfOpening = text.indexOf('{{')
    const indexOfClosing = text.indexOf('}}')
    if (indexOfClosing === -1 || indexOfOpening === -1) {
      return {
        expression: null,
        text: text
      }
    }
    return {
      index: indexOfOpening,
      indexClosing: indexOfClosing,
      expression: text.substring(indexOfOpening + 2, indexOfClosing).trim(),
      text: '' + text.substring(0, indexOfOpening) + text.substring(indexOfClosing + 2)
    }
  }

  function checkTemplateExpression (text) {
    let currText = text
    let expression = true
    let expressions = []
    let currentOffset = 0

    while (expression !== null) {
      let result = extractTemplateExpression(currText)
      currText = result.text
      expression = result.expression
      if (expression !== null) {
        expressions.push({
          expr: expression,
          indexStart: currentOffset + result.index,
          indexEnd: currentOffset + result.indexClosing
        })
        currentOffset += (result.indexClosing - result.index) + 2
      }
    }
    return {
      staticText: currText.trim(),
      hasStaticText: currText.trim().length > 0,
      expressions
    }
  }

  var textNodeMatches = matches.map((match) => {
    let expressionsInfo = checkTemplateExpression(match.sub[0])
    if (!expressionsInfo.hasStaticText) return
    if (expressionsInfo.staticText.length < 3) return
    return {
      indexInTemplate: match.index + 1,
      indexInFile: templateOffset + match.index + 1,
      originalString: match.sub[0],
      string: expressionsInfo.staticText,
      stringLength: match.sub[0].length,
      expressions: expressionsInfo.expressions,
      where: 'textNode'
    }
  }).filter(Boolean)

  var attributeResults = execall(/\s([a-z]*-)?(title|label|text|caption|placeholder|subtitle)="([^"]*)"/gm, template)

  var attributeMatches = attributeResults.map((match) => {
    if (!match.sub[2] || match.sub[2].trim() === '') return

    return {
      indexInTemplate: match.index + match.match.indexOf(match.sub[2]),
      indexInFile: templateOffset + match.index + match.match.indexOf(match.sub[2]),
      originalString: match.sub[2].trim(),
      string: match.sub[2].trim(),
      stringLength: match.sub[2].length,
      expressions: [],
      where: 'attribute'
    }
  }).filter(Boolean)

  return textNodeMatches.concat(...attributeMatches).sort((a, b) => {
    if (a.indexInFile < b.indexInFile) return -1
    if (a.indexInFile > b.indexInFile) return 1
    return 0
  })
}

/**
 * Replace untranslated strings with their corresponding $t function call
 * @param {string} pathToComponent Path to the vue component
 * @param {array} strings The strings to replace
 */
TranslationManager.prototype.replaceStringsInComponent = function (pathToComponent, strings) {
  var fileContents = fs.readFileSync(pathToComponent, { encoding: 'utf8' })
  var contentsAfter = fileContents
  var offset = 0
  strings.map((str) => {
    var translateFn = `{{ $t('${str.key}') }}`
    if (str.expressions.length > 0) {
      var params = []
      for (var i = 0; i < str.expressions.length; i++) {
        params.push(`'${i + 1}': ${str.expressions[i].expr}`)
      }
      translateFn = `{{ $t('${str.key}', { ${params.join(', ')} }) }}`
    }
    var firstPart = contentsAfter.substring(0, offset + str.indexInFile)
    var secondPart = contentsAfter.substring(offset + str.indexInFile + str.stringLength)

    if (str.where === 'attribute') {
      translateFn = `$t('${str.key}')`
      firstPart = firstPart.substring(0, firstPart.lastIndexOf(' ') + 1) + ':' + firstPart.substring(firstPart.lastIndexOf(' ') + 1)
      offset += 1
    }

    contentsAfter = `${firstPart}${translateFn}${secondPart}`
    offset += (translateFn.length - str.stringLength)
  })

  fs.writeFileSync(pathToComponent, contentsAfter)
}

const translitMap = {'Ё': 'YO', 'Й': 'I', 'Ц': 'TS', 'У': 'U', 'К': 'K', 'Е': 'E', 'Н': 'N', 'Г': 'G', 'Ш': 'SH', 'Щ': 'SCH', 'З': 'Z', 'Х': 'H', 'Ъ': '', 'ё': 'yo', 'й': 'i', 'ц': 'ts', 'у': 'u', 'к': 'k', 'е': 'e', 'н': 'n', 'г': 'g', 'ш': 'sh', 'щ': 'sch', 'з': 'z', 'х': 'h', 'ъ': '', 'Ф': 'F', 'Ы': 'I', 'В': 'V', 'А': 'A', 'П': 'P', 'Р': 'R', 'О': 'O', 'Л': 'L', 'Д': 'D', 'Ж': 'ZH', 'Э': 'E', 'ф': 'f', 'ы': 'i', 'в': 'v', 'а': 'a', 'п': 'p', 'р': 'r', 'о': 'o', 'л': 'l', 'д': 'd', 'ж': 'zh', 'э': 'e', 'Я': 'Ya', 'Ч': 'CH', 'С': 'S', 'М': 'M', 'И': 'I', 'Т': 'T', 'Ь': '', 'Б': 'B', 'Ю': 'YU', 'я': 'ya', 'ч': 'ch', 'с': 's', 'м': 'm', 'и': 'i', 'т': 't', 'ь': '', 'б': 'b', 'ю': 'yu'}

function transliterate (word) {
  return word.split('').map(function (char) {
    return translitMap[char] || char
  }).join('')
}

/**
 * Generate a suggested key (using dots) based on the given path
 * @param {string} pathToFile Path to the file
 * @param {string} text The text to be translated
 * @param {array} usedKeys Optional, array of keys that have already been used
 * @param {string} keyGenMode Key generation mode - translate or transliteration
 * @param {number} maxWordInKey Maximum number of words in a key
 * @param {string} ignoreWordsInPath Exclude words from the path
 * @returns {string}
 */
TranslationManager.prototype.getSuggestedKey = async function (pathToFile, text, usedKeys, keyGenMode, maxWordInKey, ignoreWordsInPath) {
  let ignoreWords = ['src', 'components', 'component', 'source', 'test']
  if (ignoreWordsInPath) {
    ignoreWords = ignoreWordsInPath.split(',')
  }
  const p = path.relative(this.rootPath, pathToFile)
  const prefix = p
    .split(path.sep)
    .filter((part) => ignoreWords.indexOf(part.trim()) < 0)
    .map((key) => key.toLowerCase().split('.')[0])
    .join('.')

  let preliminaryText = text
  if (keyGenMode === 'translate') {
    try {
      const { translation } = await translate({
        text,
        source: 'ru',
        target: 'en'
      })
      preliminaryText = translation
    } catch (e) {
      console.warn(e)
      console.log('Сервер не отвечает, возможно капсуль не дает доступ к https://translate.google.com/')
    }
  }

  // eslint-disable-next-line no-useless-escape
  let words = preliminaryText.replace(/[^a-zA-Zа-яА-ЯёЁ\d\s]/g, '')
    .replaceAll('ъ', '')
    .replaceAll('Ъ', '')
    .replaceAll('ь', '')
    .replaceAll('Ь', '')
    .trim()
    .split(' ')
  if (words.length > maxWordInKey) words = words.slice(0, maxWordInKey - 1)

  words = words.map(transliterate).filter((cs) => !!cs.length)

  let word = camelCase(words.join(' ').replace(/[^a-zA-Z\d\s]/g, ''))

  if (!word) word = Math.floor(Math.random() * 10000)

  let proposedKey = await this.getCompatibleKey(`${prefix}.${word}`, usedKeys)

  return proposedKey
}

TranslationManager.prototype.getCompatibleKey = async function (suggestedKey, usedKeys) {
  let keys = await this.adapter.getAllKeys()
  keys = Object.keys(keys).reduce((map, lang) => {
    return map.concat(keys[lang])
  }, [])

  if (usedKeys && typeof Array.isArray(usedKeys)) {
    keys = keys.concat(usedKeys)
  }

  let twitchIt = () => {
    return keys.some((key) => {
      let existingCheck = new RegExp('^(' + suggestedKey.replace(/\./g, '\\.') + ')(\\..*)?$')
      let existingMatch = key.match(existingCheck)

      if (existingMatch) {
        let secondPart = suggestedKey.substring(existingMatch[1].length)
        suggestedKey = `${increaseTrailingNumber(existingMatch[1])}${secondPart}`
        return true
      }

      let reg = new RegExp('^' + key.replace(/\./g, '\\.') + '(\\..*)?$')
      let match = suggestedKey.match(reg)
      if (!match) return false

      suggestedKey = increaseTrailingNumber(suggestedKey)

      return true
    })
  }

  while (twitchIt()) {}

  return suggestedKey
}

/**
 * Add a translated string to a messages resource
 * @param {string} key The key for which the strings will be saved
 * @param {object} translations Keys are the languages (e.g. "en", "de"), the values are the translated strings
 */
TranslationManager.prototype.addTranslatedString = function (key, translations) {
  return this.adapter.addTranslations(key, translations)
}

TranslationManager.prototype.getUnusedTranslations = async function () {
  var unusedTranslations = []

  let allKeys = []
  let keysInLanguages = await this.adapter.getAllKeys()
  Object.keys(keysInLanguages).map((lang) => {
    allKeys = allKeys.concat(keysInLanguages[lang])
  })

  allKeys = uniq(allKeys)

  allKeys.map((translationKey) => {
    var usages = this.getTranslationUsages(translationKey)
    if (usages.length === 0) unusedTranslations.push(translationKey)
  })

  return unusedTranslations
}

TranslationManager.prototype.getTranslationsForKey = async function (key) {
  return this.adapter.getTranslations(key)
}

TranslationManager.prototype.deleteTranslations = async function (key) {
  return this.adapter.deleteTranslations([key])
}

TranslationManager.prototype.getTranslationUsages = function (translationKey) {
  var files = glob.sync(`${this.srcPath}/**/*.vue`)
  var usages = []

  files.map((file) => {
    var fileContents = fs.readFileSync(file)
    if (fileContents.indexOf(`$t('${translationKey}'`) > -1) usages.push(file)
    if (fileContents.indexOf(`$t("${translationKey}"`) > -1) usages.push(file)
  })

  return usages
}

TranslationManager.prototype.validate = async function () {
  let missingKeys = {}
  let allKeys = []
  let keysInLanguages = await this.adapter.getAllKeys()
  Object.keys(keysInLanguages).map((lang) => {
    allKeys = allKeys.concat(keysInLanguages[lang])
  })
  allKeys = uniq(allKeys)

  this.languages.forEach((lang) => {
    for (let key of allKeys) {
      if (!keysInLanguages[lang].includes(key)) {
        if (!missingKeys.hasOwnProperty(lang)) {
          missingKeys[lang] = []
        }
        missingKeys[lang].push(key)
      }
    }
  })
  return missingKeys
}

function isInteger (value) {
  return /^\d+$/.test(value)
}

/**
 * camelCase any string
 * @param {string} text The string to be camelCased
 * @returns {string} theStringInCamelCase
 */
function camelCase (text) {
  return text
    .trim()
    .split(' ')
    .map((word) => word.toLowerCase())
    .map((word, i) => {
      return i === 0 || isInteger(word) ? word : word[0].toUpperCase() + word.substring(1)
    })
    .join('')
}

function increaseTrailingNumber (str) {
  let chars = str.split('')
  chars.reverse()
  let numbers = 0

  for (var i = 0; i < chars.length; i++) {
    if (!isNaN(parseInt(chars[i]))) numbers++
    break
  }

  chars = chars.reverse().join('')
  let keyWithoutNumber = chars.substring(0, chars.length - numbers)
  let currentNumber = parseInt(chars.substring(chars.length - numbers)) || 0

  return `${keyWithoutNumber}${++currentNumber}`
}
