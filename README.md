# @nuykon/vue-translation-manager

This is a fork - https://github.com/cyon/vue-translation-manager , which fixed some bugs and added new functionality, primarily for working with Cyrillic texts (those for initially Russian-language applications)

[![version](https://badgen.net/npm/v/@nuykon/vue-translation-manager)](https://github.com/nuykon/vue-translation-manager)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

[original docs](https://cyon.github.io/vue-translation-manager/introduction.html)

Interactive dictionary generator for internationalization from vue components(sfc).

The utility only works with sfc, which extracts text only from vue templates and replaces them with an i18n.t function call.

---
Installation
---

```
npm install @nuykon/vue-translation-manager --save-dev
```
or
```
yarn add @nuykon/vue-translation-manager -D
```

---
Customization
---

Create a config file in the root of your project - .vue-translation.js

```js
// .vue-translation.js
const path = require('path')
const { JSONAdapter } = require('@nuykon/vue-translation-manager')

module.exports = {
  srcPath: path.join(__dirname, 'src'),
  adapter: new JSONAdapter({ path: path.join(__dirname, 'i18n/messages.json') }),
  languages: ['ru', 'en']
}
```

And create empty json files (i18n/messages.json)

```json
{}
```

If you give a path to a file, we're automatically assuming you're using a single file for your translations. If
the given path is a directory we'll look for files named like this: `[language].json`.

```js
// .vue-translation.js
const path = require('path')
const { JSONAdapter } = require('@nuykon/vue-translation-manager')

module.exports = {
  srcPath: path.join(__dirname, 'src'),
  adapter: new JSONAdapter({ path: path.join(__dirname, 'i18n/') }),
  languages: ['ru', 'en']
}
```

And create empty json files (i18n/ru.json, i18n/ru.json)

```json
{}
```

---
Available Commands
---

```
nuykon-vtm [command]

Commands:
  nuykon-vtm translate     Translate vue files in path
  nuykon-vtm clean         Remove unused translations from
                                        translations resource
  nuykon-vtm add [key]     Add a new translation to the resource
                                        file(s)
  nuykon-vtm edit [key]    Edit an existing translation
  nuykon-vtm delete [key]  Delete an existing translation
  nuykon-vtm validate      Checks if translated messages are available in all
                       configured languages

Options:
  --help     Show help                                                 [boolean]
  --version  Show version number                                       [boolean]
```

## `translate`

This command starts the interactive translation manager. It looks through all the `.vue` files
inside your configured `srcPath` and detects untranslated strings.

In an interactive way you then can provide translations for all the configured languages and
the strings in the component will get replaced and the translations saved. You can repeat
this as long as there are untranslated strings in at least one of your components.

Optionally you can pass the `--ask-key` parameter. Per default we generate a key for every
untranslated string based on where it occurs and on the string itself. If you don't want this
you should provide the mentioned parameter and it will ask you to provide a key for every
string to translate. If you are content with the default string then just hit `enter`. You can
also enter a complete new key, separated by dots, or just enter a single word. Then it will
just replace the last part of the suggested key.

The vue-translation-manager will also attempt to produce interpolated strings when there
is dynamic data inside a text.


## `translate` command params


--ask-key - By default, false, the key will be generated automatically (either by translation from Russian into English(google translate), or by transliteration(Я -> YA)). If you enable this option, the utility will prompt you to enter the key name.
```bash
nuykon-vtm translate --ask-key
```

--key-gen-mode - 'translit' - default or 'translate'. the key will be generated automatically - by transliteration(Я -> YA) or by translation from Russian into English(google translate api)
```bash
nuykon-vtm translate --key-gen-mode
```

--max-word-in-key - The key is generated from the source text, the option allows you to limit the number of words from which the key will be generated. default - 4 
```bash
nuykon-vtm translate --max-word-in-key
```

--enable-message-translate - Enabling this option allows you to automatically translate key values from Russian to English. (google translate api)
```bash
nuykon-vtm translate --enable-message-translate
```

If you get the error "code: `ERR_REQUIRE_ESM" when running commands, you need to temporarily remove it from the package.your application's json string is `"type": "module",`

