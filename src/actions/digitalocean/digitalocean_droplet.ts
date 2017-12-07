import * as Hub from "../../hub"

const digitalOcean = require("do-wrapper")

const TAG = "digitalocean_droplet_id"

export class DigitalOceanDropletAction extends Hub.Action {

  constructor() {
    super()

    this.name = "digitalocean_droplet"
    this.label = "DigitalOcean - Stop Droplet"
    this.iconName = "digitalocean/DigitalOcean.png"
    this.description = "Stop a DigitalOcean droplet."
    this.params = [
      {
        name: "digitalocean_api_key",
        label: "DigitalOcean API Key",
        required: true,
        sensitive: true,
        description: "",
      },
    ]
    this.supportedActionTypes = [Hub.ActionType.Cell, Hub.ActionType.Query]
    this.supportedFormats = [Hub.ActionFormat.JsonDetail]
    this.requiredFields = [{tag: TAG}]
  }

  async execute(request: Hub.ActionRequest) {
    return new Promise<Hub.ActionResponse>((resolve , reject) => {

      let instanceIds: string[] = []
      switch (request.type) {
        case Hub.ActionType.Query:
          if (!(request.attachment && request.attachment.dataJSON)) {
            reject("Couldn't get data from attachment.")
            return
          }

          const qr = request.attachment.dataJSON
          if (!qr.fields || !qr.data) {
            reject("Request payload is an invalid format.")
            return
          }
          const fields: any[] = [].concat(...Object.keys(qr.fields).map((k) => qr.fields[k]))
          const identifiableFields = fields.filter((f: any) =>
            f.tags && f.tags.some((t: string) => t === TAG),
          )
          if (identifiableFields.length === 0) {
            reject(`Query requires a field tagged ${TAG}.`)
            return
          }
          instanceIds = qr.data.map((row: any) => (row[identifiableFields[0].name].value))
          break
        case Hub.ActionType.Cell:
          const value = request.params.value
          if (!value) {
            reject("Couldn't get data from attachment.")
            return
          }
          instanceIds = [value]
          break
      }

      const digitalOceanClient = this.digitalOceanClientFromRequest(request)
      instanceIds.forEach((dropletId) => {
        digitalOceanClient.dropletsRequestAction(+dropletId, {type: "power_off"}, (err: any) => {
          if (err) {
            resolve(new Hub.ActionResponse({success: false, message: err.message}))
          } else {
            resolve(new Hub.ActionResponse())
          }
        })
      })

    })

  }

  private digitalOceanClientFromRequest(request: Hub.ActionRequest) {
    return new digitalOcean(request.params.digitalocean_api_key!)
  }

}

Hub.addAction(new DigitalOceanDropletAction())
