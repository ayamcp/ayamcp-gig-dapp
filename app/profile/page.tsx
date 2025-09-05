import { ProtectedRoute } from "@/components/protected-route"
import { ProfileSetup } from "@/components/profile-setup"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background py-8">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
            <p className="text-muted-foreground">Manage your profile information and preferences</p>
          </div>
          <ProfileSetup />
        </div>
      </div>
    </ProtectedRoute>
  )
}
