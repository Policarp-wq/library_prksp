export class Book {
  id?: number;
  title: string;
  author: string;
  year: number;
  image?: string;
  owner_id?: string;

  constructor(
    title: string,
    author: string,
    year: number,
    image?: string,
    id?: number,
    owner_id?: string
  ) {
    this.title = title;
    this.author = author;
    this.year = year;
    this.image = image;
    if (id) this.id = id;
    if (owner_id) this.owner_id = owner_id;
  }
}
