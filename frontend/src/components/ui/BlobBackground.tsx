"use client";

export default function BlobBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="blob-cross-lr absolute top-[10%] left-0 w-[400px] h-[400px] rounded-full opacity-30 blur-[55px]"
        style={{ backgroundColor: "#7FAF8F" }} />
      <div className="blob-cross-rl absolute top-[60%] right-0 w-[350px] h-[350px] rounded-full opacity-25 blur-[50px]"
        style={{ backgroundColor: "#A7C6B0" }} />
      <div className="blob-cross-tb absolute left-[15%] top-0 w-[380px] h-[380px] rounded-full opacity-28 blur-[52px]"
        style={{ backgroundColor: "#8FC4A0" }} />
      <div className="blob-cross-bt absolute right-[20%] bottom-0 w-[320px] h-[320px] rounded-full opacity-22 blur-[48px]"
        style={{ backgroundColor: "#6B9E7A" }} />
      <div className="blob-diag-tlbr absolute top-[30%] left-0 w-[360px] h-[360px] rounded-full opacity-26 blur-[50px]"
        style={{ backgroundColor: "#BDD4C5" }} />
      <div className="blob-diag-trbl absolute bottom-[40%] right-0 w-[340px] h-[340px] rounded-full opacity-24 blur-[55px]"
        style={{ backgroundColor: "#98BFAA" }} />
      <div className="blob-diag-bltr absolute top-0 left-[50%] w-[300px] h-[300px] rounded-full opacity-20 blur-[45px]"
        style={{ backgroundColor: "#C5DDD0" }} />
      <div className="blob-diag-brtl absolute bottom-0 left-[30%] w-[370px] h-[370px] rounded-full opacity-28 blur-[58px]"
        style={{ backgroundColor: "#7FAF8F" }} />
      <div className="blob-float-1 absolute top-[20%] left-[25%] w-[280px] h-[280px] rounded-full opacity-35 blur-[50px]"
        style={{ backgroundColor: "#A7C6B0" }} />
      <div className="blob-float-2 absolute top-[50%] left-[60%] w-[320px] h-[320px] rounded-full opacity-30 blur-[55px]"
        style={{ backgroundColor: "#8FC4A0" }} />
      <div className="blob-float-3 absolute top-[70%] left-[15%] w-[260px] h-[260px] rounded-full opacity-28 blur-[48px]"
        style={{ backgroundColor: "#6B9E7A" }} />
    </div>
  );
}
