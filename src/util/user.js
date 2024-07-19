import nameFromId from './namegenerator'

export default class User {
    static getUserId() {
        // use sessionStorage for tab-based persistence
        let userId = localStorage.getItem('userId')
        if (userId === null) {
          userId = this.randString(10)
          localStorage.setItem('userId', userId)
        }
        return userId
    }

    static getUsername() {
        return nameFromId(this.getUserId())
    }

    static randString(length) {
        let validCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
        let result = ''
        for (let i = 0; i < length; i++) {
          let index = Math.floor(Math.random() * validCharacters.length)
          result = result + validCharacters.charAt(index)
        }
        return result
    }
}