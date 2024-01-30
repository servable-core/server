
export default class Messaging {
  _sender = null

  get sender() { return this._sender }
  set sender(value) { this._sender = value }

  registerSender({
    withTemplate,
    withTemplateCode
  }) {
    this.withTemplate = withTemplate
    this.withTemplateCode = withTemplateCode
  }

  async sendEmailWithTemplateCode(props) {
    return this.withTemplateCode(props)
  }

  async sendEmailWithTemplate(props) {
    return this.withTemplate(props)
  }
}
