package com.openopportunity.sharedvideo.dto;

/** Backs the public watch page — deliberately excludes anything about who else this video was
 * shared with, or the recipient's own watch history so far; a link recipient only ever needs to
 * know what to play. */
public record SharedVideoMetadata(String title, String videoUrl, Integer durationSeconds) {}
