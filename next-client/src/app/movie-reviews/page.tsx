"use client";
import { anchorProvider } from "@/lib/util";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";
import { ReviewsVariableLen, reviewsVariableLenIDL } from "anchor-local";
import { useCallback, useState } from "react";

export default function MoveReviewsAllPage() {

  const allReviews = useQuery({
    queryKey: ["all-reviews"],
    queryFn: async () => {
      const provider = await anchorProvider();
      const program = new Program<ReviewsVariableLen>(
        // @ts-ignore
        reviewsVariableLenIDL,
        provider
      );
      const reviews = await program.account.movieAccountState.all();
      return reviews;
    }
  })

  const [title, setTitle] = useState<string>();
  const [description, setDescription] = useState<string>();
  const [rating, setRating] = useState<number>();

  const createReview = useCallback(async () => {
    if (!title || !description || !rating) return;
    const provider = await anchorProvider();
    const program = new Program<ReviewsVariableLen>(
      // @ts-ignore
      reviewsVariableLenIDL,
      provider
    );

    const res = await program.methods.addMovieReview(
      title,
      description,
      rating
    ).accounts({
      reviewer: provider.wallet.publicKey,
    }).rpc();

    console.log(res);
    allReviews.refetch();
  }, [title, description, rating, allReviews])

  const closeAccount = useCallback(async (title: string) => {
    const provider = await anchorProvider();
    const program = new Program<ReviewsVariableLen>(
      // @ts-ignore
      reviewsVariableLenIDL,
      provider
    );
    const [movieReviewAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from(title), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const res = await program.methods
      .deleteMovieReview(title).accounts({
        reviewer: provider.wallet.publicKey,
        movieReviewAccount
      }).rpc();
      console.log(res);
      allReviews.refetch();
    return res;
  }, [allReviews])

  return (
    <div>
      <h1>Movie Reviews</h1>
      <div className="flex flex-col gap-1">
        <input type="text" placeholder="Title"
          onChange={(e) => setTitle(e.target.value)}
        />
        <input type="text" placeholder="Description"
          onChange={(e) => setDescription(e.target.value)}
        />
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          <option value="">Select rating</option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button onClick={createReview}>
          Create review
        </button>
      </div>
      {
        allReviews.data?.map((review, i) => {
          return <div key={i} className="bg-slate-600">
            <h2>{review.account.title}</h2>
            <p>{review.account.description}</p>
            <p>{review.account.rating}</p>
            <p>{review.account.reviewer.toBase58()}</p>
            <button>Edit</button>
            <button onClick={() => closeAccount(review.account.title)}>Delete</button>
          </div>
        })
      }
    </div>
  );
}