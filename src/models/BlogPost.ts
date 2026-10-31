import mongoose, { Schema, Document } from "mongoose";
import { defineModel } from "./defineModel";

/**
 * A post on the AutoGO blog (/blog), written by admins at Admin → Blog (rules in src/lib/blog.ts). Drafts are seen
 * only in the admin panel; a published post has publishedAt, which orders the blog and dates the post.
 */
export interface IBlogPost extends Document {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: "BUYING" | "SELLING" | "RENTING" | "SAFETY" | "MONEY" | "NEWS";
  coverImage?: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    title: { type: String, required: true, maxlength: 120 },
    excerpt: { type: String, required: true, maxlength: 300 },
    body: { type: String, required: true, maxlength: 20_000 },
    category: { type: String, enum: ["BUYING", "SELLING", "RENTING", "SAFETY", "MONEY", "NEWS"], required: true },
    coverImage: { type: String, maxlength: 500 },
    status: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

BlogPostSchema.index({ status: 1, publishedAt: -1 });

export const BlogPost = defineModel<IBlogPost>("BlogPost", BlogPostSchema);
