import Link from "next/link";

export default function HomePage() {
  return (
    <main className="z-home">
      <section className="z-home-hero">
        <div className="z-home-badge">QR Ordering SaaS</div>

        <h1>Zento</h1>

        <p className="z-home-lead">
          ระบบสั่งอาหารผ่าน QR Code สำหรับร้านอาหาร ลูกค้าสแกนโต๊ะ เลือกเมนู
          และส่งออเดอร์เข้าหน้าจอพนักงานได้ทันที
        </p>

        <div className="z-home-actions">
          <Link href="/login" className="z-btn z-btn-primary">
            เริ่มใช้งาน
          </Link>

          <Link href="/signup" className="z-btn z-btn-secondary">
            สมัครร้านอาหาร
          </Link>

          <Link href="/r/demo/table/T01" className="z-btn z-btn-secondary">
            ทดลองหน้าลูกค้า
          </Link>
        </div>
      </section>
    </main>
  );
}
