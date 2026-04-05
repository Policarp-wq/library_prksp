export class Book {
  id?: number;
  title: string;
  author: string;
  year: number;
  image?: string;

  constructor(
    title: string,
    author: string,
    year: number,
    image?: string,
    id?: number
  ) {
    this.title = title;
    this.author = author;
    this.year = year;
    this.image = image;
    if (id) this.id = id;
  }
}
