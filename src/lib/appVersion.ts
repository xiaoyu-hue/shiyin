/**
 * 应用版本号的唯一来源：仓库根 package.json 的 version。
 * 关于页等界面统一读这里，不要再把版本号写死在组件里——
 * 发版只需升 package.json（三端共用），界面显示自动跟随。
 * 安卓包的 versionName/versionCode 也由构建脚本从同一文件派生（见 android/app/build.gradle）。
 */
import pkg from '../../package.json'

export const APP_VERSION: string = pkg.version
