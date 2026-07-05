"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import BooksList from "@/components/BooksList";
import { fetchBooksByQuery } from "@/lib/utils";

const AskAIForm = () => {
  const [submittedQuery, setSubmittedQuery] = useState("");

  const { register, handleSubmit } = useForm<{ searchInput: string }>();

  const {
    data: books,
    isLoading,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["books", submittedQuery],
    queryFn: () => fetchBooksByQuery(submittedQuery),
    // Only run the query if the user has actually submitted a non-empty string
    enabled: submittedQuery.trim().length > 0,
  });

  const onSubmit = (data: { searchInput: string }) => {
    setSubmittedQuery(data.searchInput);
  };

  return (
    <div className=" space-y-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="p-4 grid gap-2 grid-cols-1 sm:grid-cols-[1fr_auto] items-end"
      >
        <Textarea
          id="book-search"
          placeholder="Type about a book you're looking for..."
          {...register("searchInput", { required: true })}
        />
        <Button
          type="submit"
          className="cursor-pointer mb-auto sm:h-full"
          disabled={isLoading || isFetching}
        >
          {isLoading || isFetching ? "Loading..." : "🤖 Ask AI"}
        </Button>
      </form>

      {/* Status & Results */}
      <div className="space-y-2">
        {isError && (
          <p className="text-destructive text-sm">
            Error: {error instanceof Error ? error.message : "Failed to fetch"}
          </p>
        )}

        {books && books.length === 0 && (
          <p className="text-muted-foreground text-sm">No books found.</p>
        )}

        {books && books.length > 0 && <BooksList books={books} />}
      </div>
    </div>
  );
};

export default AskAIForm;
