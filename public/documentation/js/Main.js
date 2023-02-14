/********************************************************************************
 * Copyright (c) 2021, 2023 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import { clear, addEvents, N, Viewable, NavTools } from "./Toolkit.js"
import { state } from "./State.js"
import { Patterns, Settings } from "./Settings.js"

const createSelectLink = (item) => addEvents(
    N(
        'a',
        item.level === 0 ? 'Home' : item.name.replace(Patterns.DISPLAY, ' '),
        {
            ... { href: `.?path=${item.path}` },
            ... (item.path === state.selection ? { class: 'selected' } : {})
        }
    ),
    {
        click: (e) => {
            e.preventDefault()
            state.setSelection(item.path, undefined)
        }
    }
)

function debounce(func, timeout = 500) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => func.apply(this, args), timeout)
    }
}

const processChange = debounce((e) => search.filter(e))

class SearchInput extends Viewable {

    constructor(search) {
        super()
        this.search = search
        this.input = addEvents(
            N('input', null, {
                type: 'search',
                class: 'search',
                placeholder: 'Search for help topics',
                value: '',
            }),
            {
                keyup: (e) => processChange(e.target.value),
                search: (e) => processChange(e.target.value),
            }
        )
        this.view = N('div', this.input, { class: 'search-input' })
        this.view.firstChild.select()
    }

    focus() {
        this.input.focus()
        return this
    }

}

class SearchOutput extends Viewable {

    constructor(parent) {
        super()
        this.parent = parent
        state.addSearchListener(this)
        this.view = N('ol', null, { class: 'search-output' })
    }

    renderResult(result) {
        const path = result.path.split('/').slice(1)
        return path
            .map((_seg, i) =>
                createSelectLink(state.data.map[
                    ([NavTools.getRoot()].concat(path.slice(0, i + 1)).join('/'))
                ])
            )
    }

    searchChanged(results) {
        try {
            this.parent.getView().removeChild(this.getView())
        } catch { }
        if (results && results.length > 0) {
            this.clear().append(results.map(result => N('li', this.renderResult(result))))
            this.parent.getView().appendChild(this.getView())
        }
        return this
    }

}

class Search extends Viewable {

    clazz = 'Search'

    constructor() {
        super()
        this.view = N('div', [
            new SearchInput(),
            new SearchOutput(this)
        ], { class: 'search' })
        state.setSearch('')
    }

    filter(e) {
        //console.log(this.clazz, e)
        if (!e) {
            state.setSearch([])
            return this
        }
        const regex = new RegExp(`(${e.toLocaleLowerCase().replace(/[^a-z0-9]/g, ' ').trim().split(/\s+/).join('|')})`, 'ig')
        const count = (expr) => ((expr || '').match(regex) || []).length
        // search in names
        const topics = Object.values(state.data.map)
            .filter(item => item.name.match(regex))
            .map(item => ({ ...item, matches: count(item.name) }))
            .sort((a, b) => (b.matches - a.matches) || (a.level - b.level))
            .slice(0, 16)
        state.setSearch(topics)
        return this
    }

}

const search = new Search()

class ChapterCard extends Viewable {

    constructor(chapter) {
        super()
        this.view = addEvents(
            N('div',
                N('div', [
                    this.getImage(chapter),
                    N('div', chapter.name.replace(Patterns.DISPLAY, ' '), { class: 'chapter-card-title' }),
                ], {
                    href: chapter.path
                }),
                { class: 'chapter-card' }
            ),
            {
                click: (e) => {
                    state.setSelection(chapter.path, undefined)
                }
            }
        )
    }

    getImage(chapter) {
        return addEvents(
            N('img', null, { alt: chapter.name, src: `/assets/images/icons/book.svg` }),
            {
                error: (e) => { e.target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }
            }
        )
    }

}

class Chapters extends Viewable {

    constructor() {
        super()
        state.addDataListener(this)
        this.items = N('div')
        this.title = N('h1', 'Catena-X Help Desk')
        this.view = N('section', [
            N('div', [
                createSelectLink({ name: '', path: NavTools.getRoot() }),
                this.title,
            ], { class: 'subheadline' }),
            this.items
        ], { class: 'chapters' })
    }

    dataChanged(data) {
        //console.log('chapters', data)
        clear(this.items)
        this.title.firstChild.data = data.name
        return this.items.appendChild(
            N('ul', data.children.map((chapter) => N('li', new ChapterCard(chapter))))
        )
    }

}

class ReleaseSelection extends Viewable {

    constructor() {
        super()
        state.addReleasesListener(this)
        this.view = N('div', null, { class: 'release-selection' })
    }

    createItem(item) {
        return N('option', item.name, { value: item.name, ...(item.name === state.releaseSelection ? { selected: 'selected' } : {}) })
    }

    releasesChanged(releases) {
        return this.clear().append(
            addEvents(
                N('select', releases.map(item =>
                    this.createItem(item))
                ),
                {
                    change: (e) => { state.setReleaseSelection(e.target.value) }
                }
            )
        )
    }

}


class Breadcrumb extends Viewable {

    constructor() {
        super()
        this.view = N('nav', null, { class: 'breadcrumb' })
    }

    renderLink(content) {
        return N('a', N('img', null, { src: 'https://github.githubassets.com/favicons/favicon-dark.svg' }), {
            class: 'github',
            target: 'github',
            alt: 'Open in GitHub',
            href: `${Settings.SRCBASE}/${content.name.endsWith('.md') ? 'blob' : 'tree'}/${state.releaseSelection}/${content.path}`
        })
    }

    createItem(item) {
        return N('li', createSelectLink(item))
    }

    selectionChanged(selection, content) {
        const list = [content]
        while (list[0].parent) {
            list.unshift(list[0].parent)
        }
        return this.clear().append(
            N('ul', list.map(item => this.createItem(item)))
        ).append(this.renderLink(content))
    }

}

class Navigation extends Viewable {

    constructor() {
        super()
        state.addMenuOpenListener(this)
        this.menu = N('ul', null, { class: 'level1' })
        this.toggle = this.createToggleButton()
        this.view = N('nav', [
            N('div', createSelectLink({ name: '', path: NavTools.getRoot() }), { class: 'home' }),
            this.menu,
            this.toggle
        ], { class: 'menu open' })
    }

    createToggleButton() {
        return addEvents(
            N('button'),
            {
                click: () => {
                    state.setMenuOpen(!state.menuOpen)
                }
            }
        )
    }

    createItem(item) {
        return N('li', createSelectLink(item))
    }

    createSubnav(category) {
        return N('li', category.children
            ? [
                createSelectLink(category),
                N('ul', category.children.filter(item => item.name !== 'index.md').map(this.createItem.bind(this)), { class: 'level2' })
            ]
            : createSelectLink(category)
        )
    }

    selectionChanged(selection, content) {
        clear(this.menu)
        let start = content
        while (start.level > 1) {
            start = start.parent
        }
        [this.createItem(start)].concat(start.children
            ? start.children.filter(item => item.name !== 'index.md').map(this.createSubnav.bind(this))
            : [document.createTextNode('')]
        ).forEach(item => this.menu.appendChild(item))
        return this
    }

    menuOpenChanged(menuOpen) {
        this.view.className = `menu ${menuOpen ? 'open' : 'closed'}`
        return this
    }

}

class Content extends Viewable {

    constructor() {
        super()
        state.addMenuOpenListener(this)
        this.breadcrumb = new Breadcrumb()
        this.view = N('article', null, { class: 'content small' })
    }

    selectionChanged(selection, content) {
        return this.clear()
            .append(this.breadcrumb.selectionChanged(selection, content))
            .append(this.renderArticle(content))
    }

    menuOpenChanged(menuOpen) {
        this.view.className = menuOpen ? 'content small' : 'content large'
        return this
    }

    renderLink(content, hash) {
        return N('a', N('img', null, { src: 'https://github.githubassets.com/favicons/favicon.svg' }), {
            class: 'github',
            target: 'github',
            alt: 'Open in GitHub',
            href: `${Settings.SRCBASE}/${content.name.endsWith('.md') ? 'blob' : 'tree'}/${state.releaseSelection}/${content.path}#${hash}`
        })
    }

    replaceLink(item) {
        const newItem = N('div', null, { class: 'headline' })
        const link = this.renderLink(this.content, item.id)
        item.parentElement.insertBefore(newItem, item)
        item.parentElement.removeChild(item)
        newItem.appendChild(item)
        newItem.appendChild(link)
        newItem.onmouseover = () => link.style.display = 'block'
        newItem.onmouseout = () => link.style.display = 'none'
        item.onclick = () => {
            history.replaceState({}, document.getElementsByTagName('title').content, location.href.split('#')[0] + (item.id ? '#' + item.id : ''))
            item.scrollIntoView()
        }
    }

    replaceLinks() {
        const root = this.zeromd.shadowRoot;
        [...root.querySelectorAll('a')].forEach(link => addEvents(
            link,
            {
                click: (e) => {
                    e.preventDefault()
                    const path = decodeURI(link.href).replace(`${Settings.DOCBASE}/${state.releaseSelection}/`, '').replace(/\/$/, '')
                    e.target.href = `.?path=${path}`
                    //console.log(link.href, path)
                    state.setSelection(path)
                }
            }
        ));
        [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].forEach(this.replaceLink.bind(this))
        root.styleSheets[0].insertRule('h1:hover, h2:hover, h3:hover, h4:hover, h5:hover { text-decoration: underline; cursor: pointer; }')
        root.styleSheets[0].insertRule('.headline { position: relative; }')
        root.styleSheets[0].insertRule('a.github { position: absolute; width: 20px; height: 20px; bottom: 15%; right: 0px; background-color: #888888; display: none; }')
    }

    renderMD(content) {
        this.content = content
        this.zeromd = N('zero-md', null, { src: `${Settings.DOCBASE}/${state.releaseSelection}/${content.path}` })
        this.checkLoadedCount = 0
        // we don't get an onload event from zero-md so waiting one sec before replacing the links
        // as a future improvement we might load the md separately and then initialize zero-md with the content
        // this would also allow to show a loading icon which is currently difficult
        this.checkLoadedTimer = setTimeout(this.replaceLinks.bind(this), 1000)
        return this.zeromd
    }

    renderOverview(content) {
        return N('ul', content.children.map((chapter) => N('li', new ChapterCard(chapter))), { class: 'subchapter' })
    }

    renderArticle(content) {
        if (!location.hash)
            window.scrollTo(0, 0)
        if (!content.children)
            return this.renderMD(content)
        if (content.children.filter(item => item.name === 'index.md').length > 0)
            return this.renderMD({ ...content, path: `${content.path}/index.md` })
        return this.renderOverview(content)
    }

}

class Chapter extends Viewable {

    constructor() {
        super()
        this.navigation = new Navigation()
        this.content = new Content()
        this.view = N('section', [
            this.navigation,
            this.content
        ], { class: 'chapter' })
    }

    selectionChanged(selection, content) {
        this.navigation.selectionChanged(selection, content)
        this.content.selectionChanged(selection, content)
        return this
    }

}

class App extends Viewable {

    clazz = 'App'

    constructor() {
        super()
        this.view = addEvents(
            document.body,
            { click: () => { state.setSearch([]) } }
        )
        while (this.view.childNodes.length > 0) {
            this.view.removeChild(this.view.lastChild)
        }
        state.addReleasesListener(this)
        state.addReleaseSelectionListener(this)
        state.addDataListener(this)
        this.loadReleases()
    }

    loadReleases() {
        //console.log(this.clazz, 'loadReleases')
        fetch('data/Releases.json')
            .then(response => response.json())
            .then((releases) => state.setReleases([{ ref: `/${Settings.DEFAULT_BRANCH}` }].concat(releases.reverse())))
    }

    releasesChanged(releases) {
        //console.log(this.clazz, 'releasesChanged', releases)
        state.setReleaseSelection(Settings.DEFAULT_BRANCH)
    }

    releaseSelectionChanged(releaseSelection) {
        //console.log(this.clazz, 'releaseSelectionChanged', releaseSelection)
        fetch(`data/${releaseSelection}/${NavTools.getRoot()}.json`)
            .then(response => response.json())
            .then(state.setData.bind(state))
            .catch(() => { location.href = '.' })
    }

    dataChanged(data) {
        //console.log(this.clazz, 'dataChanged', data)
        state.setSelection(NavTools.currentPath(), location.hash)
    }

}

class Header extends Viewable {
    constructor() {
        super()
        this.view = N(
            'header',
            [
                N('div', null, { class: 'logo' }),
                new ReleaseSelection(),
                search
            ]
        )
    }
}

class Footer extends Viewable {
    constructor() {
        super()
        this.view = N('footer', [
            N('div', '', { class: 'links' }),
            N('div', 'Copyright © Catena-X Automotive Network.', { class: 'copy' })
        ])
    }
}

class Main extends Viewable {

    clazz = 'Main'

    constructor() {
        super()
        state.addSelectionListener(this)
        this.chapters = new Chapters()
        this.chapter = new Chapter()
        this.view = N('main', this.chapters)
    }

    selectionChanged(selection, content) {
        //console.log(this.clazz, 'selectionChanged', selection)
        return this.clear().append(selection === NavTools.getRoot()
            ? this.chapters
            : this.chapter.selectionChanged(selection, content)
        )
    }

}

addEvents(
    window,
    {
        popstate: (e) => state.setSelection(e.state, undefined),
        load: () => {
            new App()
                .append(new Header())
                .append(new Main())
                .append(new Footer())
        }
    }
)