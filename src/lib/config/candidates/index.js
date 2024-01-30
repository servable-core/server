import featureCandidates from "./featureCandidates/index.js"
import _ from 'underscore'

export default async (props) => {
  const { schema } = props
  const {
    features
  } = schema

  const items = _.flatten(await Promise.all(features.map(async item =>
    featureCandidates({
      item,
      allFeatures: features
    })
  ))).filter(a => a)

  return items
}
