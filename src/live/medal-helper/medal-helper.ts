abstract class Badge {
  constructor(public isActive: boolean = false, public id: number = 0) {
  }
  static parseJson<T>(text: string, actions: { successAction: (json: any) => T, errorMessage: string, errorAction: (json: any) => T }) {
    const json = JSON.parse(text)
    if (json.code !== 0) {
      logError(`${actions.errorMessage} 错误码:${json.code} ${json.message || ""}`)
      return actions.errorAction(json)
    }
    return actions.successAction(json)
  }
  abstract activate(): Promise<boolean>
  abstract deactivate(): Promise<boolean>
  abstract getItemTemplate(): string
}
class Medal extends Badge {
  level: number
  name: string
  upName: string
  roomID: number
  isLighted: boolean
  constructor(json: any) {
    const {
      medal: {
        medal_id,
        level,
        medal_name,
        wearing_status,
        is_lighted,
      },
      anchor_info: {
        nick_name,
      },
      room_info: {
        room_id,
      },
    } = json
    super(wearing_status === 1, medal_id)
    this.level = level
    this.name = medal_name
    this.upName = nick_name
    this.roomID = room_id
    this.isLighted = is_lighted
  }
  static async getList(): Promise<Medal[]> {
    return Badge.parseJson(
      await Ajax.getTextWithCredentials(`https://api.live.bilibili.com/xlive/app-ucenter/v1/fansMedal/panel?page=1&page_size=10&target_id=${getUID()}`),
      {
        successAction: json => {
          const list: any[] = (json.data.list ?? []).concat(json.data.special_list ?? [])
          return list.map(it => new Medal(it))
        },
        errorAction: () => [],
        errorMessage: "无法获取勋章列表.",
      })
  }
  static getContainer() {
    return document.querySelector("#medal-helper .medal-popup ul") as HTMLElement
  }
  getItemTemplate(medal?: Medal) {
    if (!medal) {
      medal = this
    }
    const classes = {
      active: medal.isActive,
      gray: !medal.isLighted,
    }
    const className = Object.entries(classes).map(([name, enable]) => enable ? name : '').join(' ').trim()
    return /*html*/`
      <li data-id='${medal.id}' class='${className}'>
        <label title='${medal.upName}'>
          <input name='medal' type='radio' ${medal.isActive ? "checked" : ""}>
          <div class='fans-medal-item level-${medal.level}'>
            <span class='label'>${medal.name}</span>
            <span class='level'>${medal.level}</span>
          </div>
        </label>
      </li>`
  }
  async activate() {
    if (this.isActive) {
      return true
    }
    return Badge.parseJson(
      await Ajax.postTextWithCredentials(`https://api.live.bilibili.com/xlive/web-room/v1/fansMedal/wear`, formData({
          medal_id: this.id,
          csrf_token: getCsrf(),
          csrf: getCsrf(),
        })),
      {
        successAction: () => {
          this.isActive = true
          return true
        },
        errorAction: () => false,
        errorMessage: "佩戴勋章失败.",
      })
  }
  async deactivate() {
    if (!this.isActive) {
      return true
    }
    return Badge.parseJson(
      await Ajax.postTextWithCredentials(`https://api.live.bilibili.com/xlive/web-room/v1/fansMedal/take_off`, formData({
        csrf_token: getCsrf(),
        csrf: getCsrf(),
      })),
      {
        successAction: () => {
          this.isActive = false
          return true
        },
        errorAction: () => false,
        errorMessage: "卸下勋章失败.",
      })
  }
}
class Title extends Badge {
  static imageMap: { [id: string]: string }
  tid: number
  cid: number
  name: string
  source: string
  imageUrl: string
  constructor(json: any) {
    const { id, cid, wear, css, name, source } = json
    super(wear, css)
    this.tid = id
    this.cid = cid
    this.name = name
    this.source = source
    Title.getImageMap().then(it => {
      this.imageUrl = it[this.id]
    })
  }
  static async getImageMap() {
    if (Title.imageMap === undefined) {
      return Badge.parseJson(
        await Ajax.getTextWithCredentials("https://api.live.bilibili.com/rc/v1/Title/webTitles"),
        {
          successAction(json) {
            Title.imageMap = {}
            json.data.forEach((it: any) => {
              Title.imageMap[it.identification] = it.web_pic_url
            })
            return Title.imageMap
          },
          errorAction: () => { return {} },
          errorMessage: "获取头衔图片失败.",
        })
    }
    else {
      return Title.imageMap
    }
  }
  static async getList(): Promise<Title[]> {
    return Badge.parseJson(
      await Ajax.getTextWithCredentials("https://api.live.bilibili.com/i/api/ajaxTitleInfo?page=1&pageSize=256&had=1"),
      {
        successAction: json => json.data.list.map((it: any) => new Title(it)),
        errorAction: () => [],
        errorMessage: "无法获取头衔列表.",
      })
  }
  static getContainer() {
    return document.querySelector("#title-helper .medal-popup ul") as HTMLElement
  }
  getItemTemplate(title?: Title) {
    if (!title) {
      title = this
    }
    return /*html*/`
      <li data-id='${title.id}' ${title.isActive ? "class='active'" : ""}>
        <label title='${title.name}'>
          <input name='medal' type='radio' ${title.isActive ? "checked" : ""}>
          <img src='${title.imageUrl}' class="title-image">
        </label>
      </li>`
  }
  async activate() {
    if (this.isActive) {
      return true
    }
    return Badge.parseJson(
      await Ajax.postTextWithCredentials(`https://api.live.bilibili.com/i/ajaxWearTitle`, `id=${this.tid}&cid=${this.cid}&csrf=${getCsrf()}&csrf_token=${getCsrf()}`),
      {
        successAction: () => {
          this.isActive = true
          return true
        },
        errorAction: () => false,
        errorMessage: "佩戴头衔失败.",
      })
  }
  async deactivate() {
    if (!this.isActive) {
      return true
    }
    return Badge.parseJson(
      await Ajax.postTextWithCredentials(`https://api.live.bilibili.com/i/ajaxCancelWearTitle`,
      `csrf=${getCsrf()}&csrf_token=${getCsrf()}`),
      {
        successAction: () => {
          this.isActive = false
          return true
        },
        errorAction: () => false,
        errorMessage: "卸下头衔失败.",
      })
  }
}
async function loadBadges<T extends Badge>(getContainer: () => HTMLElement, getList: () => Promise<T[]>) {
  const badgeContainer = getContainer()
  const badges = await getList()
  const updateList = async () => {
    const badges = await getList()
    badges.forEach(badge => {
      const li = badgeContainer.querySelector(`li[data-id='${badge.id}']`) as HTMLElement
      if (badge.isActive) {
        li.classList.add("active")
      }
      else {
        li.classList.remove("active")
      }
      li.querySelector(`input`)!!.checked = badge.isActive
    })
  }
  badges.forEach(badge => {
    const itemHtml = badge.getItemTemplate()
    badgeContainer.insertAdjacentHTML("beforeend", itemHtml)
    const item = badgeContainer.querySelector(`li[data-id='${badge.id}']`) as HTMLElement
    const input = item.querySelector(`input`)
    item.addEventListener("click", e => {
      if (e.target === input) {
        return
      }
      if (badge.isActive) {
        badge.deactivate().then(updateList)
      }
      else {
        const activeBadge = badges.find(it => it.isActive)
        if (activeBadge) {
          activeBadge.isActive = false
        }
        badge.activate().then(() => {
          if (badge instanceof Medal) {
            settings.defaultMedalID = badge.id
          }
        }).then(updateList)
      }
    })
  })
}
if (settings.autoMatchMedal) {
  (async () => {
    const match = document.URL.match(/live\.bilibili\.com\/(\d+)/)
    if (!match) {
      return
    }
    const roomID = parseInt(match[1])
    if (isNaN(roomID)) {
      console.warn(`roomID not found`)
      return
    }
    const medalList = await Medal.getList()
    if (!settings.defaultMedalID) {
      const activeMedal = medalList.find(m => m.isActive)
      if (activeMedal) {
        settings.defaultMedalID = activeMedal.id
        console.log(`set defaultMedalID to activeMedal (${activeMedal.id})`)
      }
    }
    const defaultMedal = settings.defaultMedalID
      ? medalList.find(m => m.id === settings.defaultMedalID)
      : medalList.find(m => m.isActive)

    const matchMedal = medalList.find(m => m.roomID === roomID)
    if (!matchMedal) {
      if (defaultMedal) {
        await defaultMedal.activate()
        console.log(`no matchMedal, fallback to defaultMedal (${defaultMedal.id})`)
      }
    } else {
      await matchMedal.activate()
      console.log(`activated matchMedal (${matchMedal.id})`)
    }
  })()
}
export default {
  export: {
    Badge,
    Medal,
    Title,
  },
  widget: {
    condition: () => document.URL.startsWith('https://live.bilibili.com') && Boolean(getUID()),
    content: resources.import('medalHelperHtml'),
    success: async () => {
      resources.applyImportantStyle('medalHelperStyle')
      document.querySelectorAll(".medal-helper").forEach(it => {
        const popup = it.querySelector(".medal-popup") as HTMLElement
        it.addEventListener("click", e => {
          if (!popup.contains(e.target as HTMLElement)) {
            popup.classList.toggle("opened")
          }
        })
      })
      loadBadges(Medal.getContainer, Medal.getList)
      await Title.getImageMap()
      loadBadges(Title.getContainer, Title.getList)
    },
  }
}
