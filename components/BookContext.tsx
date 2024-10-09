"use client";

import React, { createContext, ReactNode, useContext, useState } from "react";

interface Book {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
}

interface BookContextType {
  likedBooks: Book[];
  addLikedBook: (book: Book) => void;
  removeLikedBook: (id: string) => void;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export const useBooks = () => {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error("useBooks must be used within a BookProvider");
  }
  return context;
};

interface BookProviderProps {
  children: ReactNode;
}

export const BookProvider: React.FC<BookProviderProps> = ({ children }) => {
  const [likedBooks, setLikedBooks] = useState<Book[]>([]);

  const addLikedBook = (book: Book) => {
    setLikedBooks((prev) => {
      if (!prev.some((b) => b.id === book.id)) {
        return [...prev, book];
      }
      return prev;
    });
  };

  const removeLikedBook = (id: string) => {
    setLikedBooks((prev) => prev.filter((book) => book.id !== id));
  };

  return (
    <BookContext.Provider value={{ likedBooks, addLikedBook, removeLikedBook }}>
      {children}
    </BookContext.Provider>
  );
};
