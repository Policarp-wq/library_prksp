export class Book {
  id?: number;
  title: string;
  author: string;
  year: number;
  image?: string;
  owner_id?: string;
  available?: boolean;
  canDelete?: boolean;
  deleteReason?: string;
  url?: string;

  constructor(
    title: string,
    author: string,
    year: number,
    image?: string,
    id?: number,
    owner_id?: string,
    available?: boolean,
    canDelete?: boolean,
    deleteReason?: string,
    url?: string
  ) {
    this.title = title;
    this.author = author;
    this.year = year;
    this.image = image;
    if (id) this.id = id;
    if (owner_id) this.owner_id = owner_id;
    if (available !== undefined) this.available = available;
    if (canDelete !== undefined) this.canDelete = canDelete;
    if (deleteReason) this.deleteReason = deleteReason;
    if (url) this.url = url;
  }
}
