"use client";

import type { Book } from "backend/db/schema";

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { truncateText } from "@/lib/utils";

interface Props {
  books: Book[];
}

const BooksList = ({ books }: Props) => {
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 grid-rows-[auto_1fr_auto]">
      {books.map((book) => (
        <li key={book.id} className="grid grid-rows-subgrid row-span-3 text-sm">
          <Card className="relative mx-auto w-full max-w-sm pt-0 grid grid-rows-subgrid row-span-3">
            <div className="absolute inset-0 z-30 aspect-video bg-black/35" />

            <div className="row-span-1 aspect-video overflow-hidden flex justify-center">
              <img
                src={book.thumbnail ?? "/images/No-Image-Placeholder.svg.webp"}
                alt="Event cover"
                className="relative object-cover"
              />
            </div>

            <CardHeader className="row-span-1 flex flex-col">
              <CardAction className="flex gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 block truncate"
                >
                  {book.average_rating}
                </Badge>

                <Badge
                  variant="secondary"
                  className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 max-w-55 block truncate"
                >
                  {book.authors}
                </Badge>
              </CardAction>
              <div>
                <CardTitle>{book.title}</CardTitle>
                <small>{book.subtitle}</small>
                <CardDescription className="mt-2">
                  {book.description && truncateText(book.description, 150)}
                </CardDescription>
              </div>
            </CardHeader>

            <CardFooter className="row-span-1">
              <Button className="w-full cursor-pointer">
                <a
                  href={`https://www.goodreads.com/book/isbn/${book.isbn10 ?? book.isbn13}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  see on GoodReads
                </a>
              </Button>
            </CardFooter>
          </Card>
        </li>
      ))}
    </ul>
  );
};

export default BooksList;
