// import { documentFeature } from '../../../manifest/src/index.js'
// import documentFeature from '../document/index.js'
// import { documentFeature } from '@servable/tools'
// import { generateGithubReadme } from '../../../manifest/src/index.js'
import { generateGithubReadme } from '@servable/tools'

export default async (props) => {

  // await Promise.all([props.schema.features[0]].map(async schema => {

  // await Promise.all(props.schema.features.map(async (schema, index) => {
  //   if (index === 17) {
  //     const dic = await documentFeature({
  //       path: schema.loader.path,
  //       write: true
  //     })
  //     console.log(dic)
  //   }
  // }))

  // return

  await Promise.all(props.schema.features.map(async (schema, index) => {
    if (index === 17) {
      const dic = await generateGithubReadme({
        path: schema.loader.path,
        write: true,
        targetPath: `${schema.loader.path}/README.md`
      })
      // console.log(dic)
    }
  }))
}
