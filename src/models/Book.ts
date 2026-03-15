export class Book {
  title: string
  author: string
  year: number
  image?: string

  constructor(title: string, author: string, year: number, image?: string) {
    this.title = title
    this.author = author
    this.year = year
    this.image = image
  }
}
