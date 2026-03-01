/**
 * Simple WebM encoder/muxer for WebCodecs output
 * Based on the WebM container specification
 */

interface WebMFrame {
  data: Uint8Array;
  timestamp: number;
  isKeyFrame: boolean;
}

export class WebMEncoder {
  private frames: WebMFrame[] = [];
  private width: number;
  private height: number;
  private fps: number;
  private duration: number = 0;

  constructor(width: number, height: number, fps: number) {
    this.width = width;
    this.height = height;
    this.fps = fps;
  }

  addFrame(chunk: EncodedVideoChunk) {
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    
    this.frames.push({
      data,
      timestamp: chunk.timestamp / 1000000, // Convert to seconds
      isKeyFrame: chunk.type === 'key'
    });

    this.duration = Math.max(this.duration, chunk.timestamp / 1000000);
  }

  encode(): Uint8Array {
    const segments: Uint8Array[] = [];
    
    // EBML Header
    segments.push(this.createEBMLHeader());
    
    // Segment
    const segmentData = this.createSegment();
    segments.push(segmentData);
    
    // Calculate total size
    const totalSize = segments.reduce((sum, seg) => sum + seg.length, 0);
    const output = new Uint8Array(totalSize);
    
    let offset = 0;
    for (const segment of segments) {
      output.set(segment, offset);
      offset += segment.length;
    }
    
    return output;
  }

  private createEBMLHeader(): Uint8Array {
    const header: number[] = [];
    
    // EBML
    header.push(...this.encodeElement(0x1A45DFA3, [
      // EBMLVersion
      ...this.encodeElement(0x4286, this.encodeUInt(1)),
      // EBMLReadVersion
      ...this.encodeElement(0x42F7, this.encodeUInt(1)),
      // EBMLMaxIDLength
      ...this.encodeElement(0x42F2, this.encodeUInt(4)),
      // EBMLMaxSizeLength
      ...this.encodeElement(0x42F3, this.encodeUInt(8)),
      // DocType
      ...this.encodeElement(0x4282, this.encodeString('webm')),
      // DocTypeVersion
      ...this.encodeElement(0x4287, this.encodeUInt(2)),
      // DocTypeReadVersion
      ...this.encodeElement(0x4285, this.encodeUInt(2))
    ]));
    
    return new Uint8Array(header);
  }

  private createSegment(): Uint8Array {
    const segmentData: number[] = [];
    
    // SeekHead (placeholder)
    const seekHead = this.createSeekHead();
    segmentData.push(...seekHead);
    
    // Info
    const info = this.createInfo();
    segmentData.push(...info);
    
    // Tracks
    const tracks = this.createTracks();
    segmentData.push(...tracks);
    
    // Cluster(s)
    const clusters = this.createClusters();
    segmentData.push(...clusters);
    
    // Segment element
    return new Uint8Array(this.encodeElement(0x18538067, segmentData));
  }

  private createSeekHead(): number[] {
    // Simplified SeekHead - in production, this should contain actual seek positions
    return this.encodeElement(0x114D9B74, []);
  }

  private createInfo(): number[] {
    return this.encodeElement(0x1549A966, [
      // TimecodeScale (1ms)
      ...this.encodeElement(0x2AD7B1, this.encodeUInt(1000000)),
      // Duration
      ...this.encodeElement(0x4489, this.encodeFloat(this.duration * 1000)),
      // MuxingApp
      ...this.encodeElement(0x4D80, this.encodeString('WebM Encoder')),
      // WritingApp
      ...this.encodeElement(0x5741, this.encodeString('Anemoia Video Editor'))
    ]);
  }

  private createTracks(): number[] {
    return this.encodeElement(0x1654AE6B, [
      // TrackEntry
      ...this.encodeElement(0xAE, [
        // TrackNumber
        ...this.encodeElement(0xD7, this.encodeUInt(1)),
        // TrackUID
        ...this.encodeElement(0x73C5, this.encodeUInt(1)),
        // TrackType (1 = video)
        ...this.encodeElement(0x83, this.encodeUInt(1)),
        // CodecID
        ...this.encodeElement(0x86, this.encodeString('V_VP9')),
        // Video
        ...this.encodeElement(0xE0, [
          // PixelWidth
          ...this.encodeElement(0xB0, this.encodeUInt(this.width)),
          // PixelHeight
          ...this.encodeElement(0xBA, this.encodeUInt(this.height)),
          // FrameRate
          ...this.encodeElement(0x2383E3, this.encodeFloat(this.fps))
        ])
      ])
    ]);
  }

  private createClusters(): number[] {
    const clusters: number[] = [];
    let currentClusterTimecode = 0;
    const clusterDuration = 1000; // 1 second clusters
    
    let i = 0;
    while (i < this.frames.length) {
      const clusterFrames: WebMFrame[] = [];
      const clusterStart = currentClusterTimecode;
      
      // Add frames to cluster
      while (i < this.frames.length && 
             this.frames[i].timestamp - clusterStart < clusterDuration) {
        clusterFrames.push(this.frames[i]);
        i++;
      }
      
      if (clusterFrames.length > 0) {
        clusters.push(...this.createCluster(clusterStart, clusterFrames));
        currentClusterTimecode = clusterFrames[clusterFrames.length - 1].timestamp;
      }
    }
    
    return clusters;
  }

  private createCluster(timecode: number, frames: WebMFrame[]): number[] {
    const clusterData: number[] = [];
    
    // Timecode
    clusterData.push(...this.encodeElement(0xE7, this.encodeUInt(Math.round(timecode))));
    
    // SimpleBlocks
    for (const frame of frames) {
      clusterData.push(...this.createSimpleBlock(frame, timecode));
    }
    
    return this.encodeElement(0x1F43B675, clusterData);
  }

  private createSimpleBlock(frame: WebMFrame, clusterTimecode: number): number[] {
    const relativeTimecode = Math.round(frame.timestamp - clusterTimecode);
    const flags = frame.isKeyFrame ? 0x80 : 0x00;
    
    const blockData: number[] = [
      0x81, // Track number (1)
      (relativeTimecode >> 8) & 0xFF,
      relativeTimecode & 0xFF,
      flags,
      ...Array.from(frame.data)
    ];
    
    return this.encodeElement(0xA3, blockData);
  }

  private encodeElement(id: number, data: number[] | Uint8Array): number[] {
    const encodedId = this.encodeVInt(id);
    const encodedSize = this.encodeVInt(data.length);
    
    return [
      ...encodedId,
      ...encodedSize,
      ...(Array.isArray(data) ? data : Array.from(data))
    ];
  }

  private encodeVInt(value: number): number[] {
    const bytes: number[] = [];
    
    if (value < 0x80) {
      bytes.push(value | 0x80);
    } else if (value < 0x4000) {
      bytes.push((value >> 8) | 0x40);
      bytes.push(value & 0xFF);
    } else if (value < 0x200000) {
      bytes.push((value >> 16) | 0x20);
      bytes.push((value >> 8) & 0xFF);
      bytes.push(value & 0xFF);
    } else if (value < 0x10000000) {
      bytes.push((value >> 24) | 0x10);
      bytes.push((value >> 16) & 0xFF);
      bytes.push((value >> 8) & 0xFF);
      bytes.push(value & 0xFF);
    }
    
    return bytes;
  }

  private encodeUInt(value: number): number[] {
    const bytes: number[] = [];
    
    while (value > 0) {
      bytes.unshift(value & 0xFF);
      value = Math.floor(value / 256);
    }
    
    return bytes.length > 0 ? bytes : [0];
  }

  private encodeFloat(value: number): number[] {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    view.setFloat64(0, value, false);
    
    return Array.from(new Uint8Array(buffer));
  }

  private encodeString(str: string): number[] {
    return Array.from(new TextEncoder().encode(str));
  }
} 