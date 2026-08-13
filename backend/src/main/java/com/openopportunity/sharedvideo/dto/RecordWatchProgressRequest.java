package com.openopportunity.sharedvideo.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RecordWatchProgressRequest(@NotNull @Min(0) Integer watchedSeconds) {}
