"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion, PanInfo, useAnimation } from "framer-motion";
import { AlertCircle, Book, Heart, Loader, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useBooks } from "./BookContext";

interface Book {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
}

const fetchBookByISBN = async (): Promise<Book> => {
  const calculateCheckDigit = (input: string): number => {
    const digits = input.split("").map(Number);
    let sum = 0;
    digits.forEach((digit, index) => {
      sum += index % 2 === 0 ? digit : digit * 3;
    });
    return (10 - (sum % 10)) % 10;
  };

  const generateRandomISBN = (): string => {
    const random_twelveNum = "978409" + Math.random().toString().slice(2, 8);
    return random_twelveNum + calculateCheckDigit(random_twelveNum);
  };

  const fetchBook = async (isbn: string): Promise<Book | null> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
      );
      if (!response.ok) {
        throw new Error("ネットワークエラーが発生しました");
      }
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return null; // 本が見つからない場合はnullを返す
      }

      const bookInfo = data.items[0].volumeInfo;
      return {
        id: isbn,
        title: bookInfo.title || "不明なタイトル",
        imageUrl:
          bookInfo.imageLinks?.thumbnail ||
          "/../app/placeholder.png?height=300&width=200",
        caption:
          bookInfo.description?.slice(0, 100) + "..." || "説明がありません",
      };
    } catch (error) {
      console.error("Book fetch error:", error);
      return null; // エラーが発生した場合もnullを返す
    }
  };

  while (true) {
    const isbn = generateRandomISBN();
    const book = await fetchBook(isbn);
    if (book) {
      return book; // 有効な本が見つかった場合、それを返す
    }
    // 本が見つからなかった場合、短い待機時間を設けてから再試行
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
};

export function BookSwipeScreenComponent() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const { addLikedBook } = useBooks();
  const controls = useAnimation();
  const constraintsRef = useRef(null);
  const [dragX, setDragX] = useState(0);

  const fallbackImageUrl = "../app/placeholder.png?height=300&width=200";

  const fetchNewBook = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newBook = await fetchBookByISBN();
      setCurrentBook(newBook);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "予期せぬエラーが発生しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNewBook();
  }, []);

  const handleSwipe = async (swipeDirection: "left" | "right") => {
    setDirection(swipeDirection);
    if (swipeDirection === "right" && currentBook) {
      addLikedBook(currentBook);
    }
    await controls.start({
      x: swipeDirection === "left" ? -300 : 300,
      opacity: 0,
      rotateY: swipeDirection === "left" ? -45 : 45,
    });
    fetchNewBook();
    controls.set({ x: 0, opacity: 1, rotateY: 0 });
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const threshold = 100; // スワイプを検出する閾値
    if (info.offset.x < -threshold) {
      handleSwipe("left");
    } else if (info.offset.x > threshold) {
      handleSwipe("right");
    } else {
      controls.start({ x: 0, opacity: 1, rotateY: 0 });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <header className="p-4 text-center">
        <h1 className="text-2xl font-bold">本のマッチング</h1>
      </header>

      <main
        className="flex-1 flex items-center justify-center p-4"
        ref={constraintsRef}
      >
        {isLoading ? (
          <div className="flex flex-col items-center">
            <Loader className="h-8 w-8 animate-spin" />
            <p className="mt-2">本を探しています...</p>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button onClick={fetchNewBook} className="mt-4">
              再試行
            </Button>
          </Alert>
        ) : (
          <AnimatePresence>
            {currentBook && (
              <motion.div
                key={currentBook.id}
                className="w-full max-w-sm aspect-[3/4] bg-card text-card-foreground shadow-lg rounded-lg overflow-hidden relative cursor-grab active:cursor-grabbing"
                animate={controls}
                initial={{ x: 0, opacity: 1, rotateY: 0 }}
                exit={{
                  x: direction === "left" ? -300 : 300,
                  opacity: 0,
                  rotateY: direction === "left" ? -45 : 45,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                drag="x"
                dragConstraints={constraintsRef}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                onDrag={(event, info) => {
                  setDragX(info.offset.x);
                }}
                whileDrag={{
                  scale: 1.05,
                }}
                style={{
                  rotateY: dragX < 0 ? -15 : dragX > 0 ? 15 : 0,
                  backgroundColor:
                    dragX < 0
                      ? "rgba(239, 68, 68, 0.2)"
                      : dragX > 0
                      ? "rgba(34, 197, 94, 0.2)"
                      : "transparent",
                }}
              >
                <Image
                  src={currentBook.imageUrl}
                  alt={currentBook.title}
                  layout="fill"
                  objectFit="cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = fallbackImageUrl;
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                  <h2 className="text-xl font-bold text-white">
                    {currentBook.title}
                  </h2>
                  <p className="text-sm text-gray-300">{currentBook.caption}</p>
                </div>
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-gray-300 to-transparent opacity-50" />
                <motion.div
                  className="absolute top-4 left-4 bg-red-500 rounded-full p-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: dragX < -50 ? 1 : 0 }}
                >
                  <X className="text-white" />
                </motion.div>
                <motion.div
                  className="absolute top-4 right-4 bg-green-500 rounded-full p-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: dragX > 50 ? 1 : 0 }}
                >
                  <Heart className="text-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      <footer className="p-4 flex justify-around">
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSwipe("left")}
          disabled={isLoading || !!error}
        >
          <X className="h-6 w-6" />
          <span className="sr-only">スキップ</span>
        </Button>
        <Link href="/liked-books">
          <Button variant="outline" size="icon">
            <Book className="h-6 w-6" />
            <span className="sr-only">いいねした本</span>
          </Button>
        </Link>
        <Button
          variant="outline"
          size="icon"
          onClick={() => handleSwipe("right")}
          disabled={isLoading || !!error}
        >
          <Heart className="h-6 w-6" />
          <span className="sr-only">いいね</span>
        </Button>
      </footer>
    </div>
  );
}
