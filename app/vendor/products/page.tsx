'use client'

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Edit,
  Eye,
  Package,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
} from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { parseJsonResponse } from '../../../lib/http/parse-json-response';
import type {
  ProductCategory,
  VendorListingSummary,
} from '../../../types';
import { formatCurrency } from '../../../utils/format';

type VendorListingsPayload = {
  data?: VendorListingSummary[] | null;
  error?: {
    message?: string;
  } | null;
};

type VendorListingPayload = {
  data?: VendorListingSummary | null;
  error?: {
    message?: string;
  } | null;
};

type ListingFormState = {
  name: string;
  category: ProductCategory;
  description: string;
  price: string;
  unit: string;
  stock: string;
  minOrder: string;
  maxOrder: string;
  freshness: 'fresh' | 'very-fresh' | 'premium';
  isOrganic: boolean;
};

const EMPTY_FORM: ListingFormState = {
  name: '',
  category: 'vegetables',
  description: '',
  price: '',
  unit: 'kg',
  stock: '',
  minOrder: '1',
  maxOrder: '',
  freshness: 'fresh',
  isOrganic: false,
};

const CATEGORIES: ProductCategory[] = [
  'vegetables',
  'fruits',
  'grains',
  'tubers',
  'meat',
  'fish',
  'dairy',
  'spices',
  'herbs',
  'processed',
];

const VendorProductsPage: React.FC = () => {
  const [listings, setListings] = useState<VendorListingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<
    VendorListingSummary['publishStatus'] | 'all'
  >('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<VendorListingSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionListingId, setActionListingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<ListingFormState>(EMPTY_FORM);

  useEffect(() => {
    let isMounted = true;

    async function loadListings() {
      try {
        const response = await fetch('/api/vendor/listings', {
          cache: 'no-store',
        });
        const payload = await parseJsonResponse<VendorListingsPayload>(response);

        if (!response.ok) {
          throw new Error(
            payload?.error?.message ?? 'Could not load vendor listings.',
          );
        }

        if (isMounted) {
          setListings(payload?.data ?? []);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load vendor listings.',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadListings();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const matchesQuery =
          !searchQuery.trim() ||
          listing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          listing.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' || listing.category === selectedCategory;
        const matchesStatus =
          selectedStatus === 'all' || listing.publishStatus === selectedStatus;

        return matchesQuery && matchesCategory && matchesStatus;
      }),
    [listings, searchQuery, selectedCategory, selectedStatus],
  );

  function resetForm() {
    setFormData(EMPTY_FORM);
    setEditingListing(null);
  }

  function populateForm(listing: VendorListingSummary) {
    setFormData({
      name: listing.name,
      category: listing.category,
      description: listing.description,
      price: listing.price.toString(),
      unit: listing.unit,
      stock: listing.stock.toString(),
      minOrder: listing.minOrder.toString(),
      maxOrder: listing.maxOrder?.toString() ?? '',
      freshness: listing.freshness,
      isOrganic: listing.isOrganic,
    });
  }

  async function handleCreateListing() {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/vendor/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          price: Number(formData.price),
          unit: formData.unit,
          stock: Number(formData.stock),
          minOrder: Number(formData.minOrder),
          maxOrder: formData.maxOrder ? Number(formData.maxOrder) : null,
          freshness: formData.freshness,
          isOrganic: formData.isOrganic,
        }),
      });
      const payload = await parseJsonResponse<VendorListingPayload>(response);

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Could not create listing.');
      }

      setListings((current) => [payload.data!, ...current]);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : 'Could not create listing.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateListing() {
    if (!editingListing) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/vendor/listings/${editingListing.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          description: formData.description,
          price: Number(formData.price),
          unit: formData.unit,
          stock: Number(formData.stock),
          minOrder: Number(formData.minOrder),
          maxOrder: formData.maxOrder ? Number(formData.maxOrder) : null,
          freshness: formData.freshness,
          isOrganic: formData.isOrganic,
        }),
      });
      const payload = await parseJsonResponse<VendorListingPayload>(response);

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.error?.message ?? 'Could not update listing.');
      }

      setListings((current) =>
        current.map((listing) =>
          listing.id === payload.data!.id ? payload.data! : listing,
        ),
      );
      setIsEditDialogOpen(false);
      resetForm();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Could not update listing.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteListing(listingId: string) {
    const confirmed = window.confirm(
      'Delete this listing? This removes it from the vendor workspace.',
    );

    if (!confirmed) {
      return;
    }

    setActionListingId(listingId);
    setError('');

    try {
      const response = await fetch(`/api/vendor/listings/${listingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const payload = await parseJsonResponse<VendorListingPayload>(response);
        throw new Error(payload?.error?.message ?? 'Could not delete listing.');
      }

      setListings((current) => current.filter((listing) => listing.id !== listingId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete listing.',
      );
    } finally {
      setActionListingId(null);
    }
  }

  async function handleVendorAction(
    listingId: string,
    action: 'submit-for-review' | 'unpublish',
  ) {
    setActionListingId(listingId);
    setError('');

    try {
      const response = await fetch(`/api/vendor/listings/${listingId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      const payload = await parseJsonResponse<VendorListingPayload>(response);

      if (!response.ok || !payload?.data) {
        throw new Error(
          payload?.error?.message ?? 'Could not update listing status.',
        );
      }

      setListings((current) =>
        current.map((listing) =>
          listing.id === payload.data!.id ? payload.data! : listing,
        ),
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : 'Could not update listing status.',
      );
    } finally {
      setActionListingId(null);
    }
  }

  function getAvailabilityBadgeVariant(status: VendorListingSummary['availabilityStatus']) {
    if (status === 'out-of-stock' || status === 'unavailable') {
      return 'destructive';
    }

    if (status === 'low-stock') {
      return 'secondary';
    }

    return 'default';
  }

  function renderListingForm() {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Listing Name</label>
            <Input
              value={formData.name}
              onChange={(event) =>
                setFormData((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Fresh tomatoes"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Category</label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  category: value as ProductCategory,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea
            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={formData.description}
            onChange={(event) =>
              setFormData((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="Describe the product, freshness, and any notable details."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">Price</label>
            <Input
              type="number"
              value={formData.price}
              onChange={(event) =>
                setFormData((current) => ({ ...current, price: event.target.value }))
              }
              placeholder="2500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Unit</label>
            <Input
              value={formData.unit}
              onChange={(event) =>
                setFormData((current) => ({ ...current, unit: event.target.value }))
              }
              placeholder="kg"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Stock</label>
            <Input
              type="number"
              value={formData.stock}
              onChange={(event) =>
                setFormData((current) => ({ ...current, stock: event.target.value }))
              }
              placeholder="50"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Minimum Order</label>
            <Input
              type="number"
              value={formData.minOrder}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  minOrder: event.target.value,
                }))
              }
              placeholder="1"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Maximum Order
            </label>
            <Input
              type="number"
              value={formData.maxOrder}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  maxOrder: event.target.value,
                }))
              }
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Freshness Grade</label>
            <Select
              value={formData.freshness}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  freshness: value as ListingFormState['freshness'],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fresh">Fresh</SelectItem>
                <SelectItem value="very-fresh">Very Fresh</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-8">
            <input
              id="isOrganic"
              type="checkbox"
              checked={formData.isOrganic}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  isOrganic: event.target.checked,
                }))
              }
            />
            <label htmlFor="isOrganic" className="text-sm font-medium">
              Organic listing
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Product listings</h1>
          <p className="mt-1 text-muted-foreground">
            Create draft listings, submit them for review, and manage what goes live.
          </p>
        </div>
        <Dialog
          open={isAddDialogOpen}
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Vendor Listing</DialogTitle>
              <DialogDescription>
                New listings start as drafts until you submit them for admin review.
              </DialogDescription>
            </DialogHeader>
            {renderListingForm()}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateListing} disabled={isSubmitting}>
                <Save className="mr-2 h-4 w-4" />
                Create Draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
            <Select
              value={selectedCategory}
              onValueChange={(value) =>
                setSelectedCategory(value as ProductCategory | 'all')
              }
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setSelectedStatus(
                  value as VendorListingSummary['publishStatus'] | 'all',
                )
              }
            >
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending-review">Pending review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="unpublished">Unpublished</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listing inventory</CardTitle>
          <CardDescription>
            {filteredListings.length} of {listings.length} listing
            {listings.length === 1 ? '' : 's'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <p className="text-muted-foreground">Loading listings...</p>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground">
                {listings.length === 0 ? 'No listings yet' : 'No listings match your filters'}
              </h3>
              <p className="mt-2 text-muted-foreground">
                {listings.length === 0
                  ? 'Create the first draft listing to start the moderation workflow.'
                  : 'Try another search or status filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Listing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Availability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Publish Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {filteredListings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                            <Image
                              src={listing.image}
                              alt={listing.name}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{listing.name}</p>
                            <p className="text-sm capitalize text-muted-foreground">
                              {listing.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatCurrency(listing.price)} / {listing.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">
                        {listing.stock} {listing.unit}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={getAvailabilityBadgeVariant(
                            listing.availabilityStatus,
                          )}
                          className="capitalize"
                        >
                          {listing.availabilityStatus.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="capitalize">
                          {listing.publishStatus.replace('-', ' ')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="View public listing"
                          >
                            <a href={`/products/${listing.id}`}>
                              <Eye className="h-4 w-4" />
                            </a>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingListing(listing);
                              populateForm(listing);
                              setIsEditDialogOpen(true);
                            }}
                            title="Edit listing"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {(listing.publishStatus === 'draft' ||
                            listing.publishStatus === 'unpublished') && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionListingId === listing.id}
                              onClick={() =>
                                handleVendorAction(listing.id, 'submit-for-review')
                              }
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Submit
                            </Button>
                          )}

                          {listing.publishStatus === 'published' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionListingId === listing.id}
                              onClick={() =>
                                handleVendorAction(listing.id, 'unpublish')
                              }
                            >
                              Unpublish
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionListingId === listing.id}
                            onClick={() => handleDeleteListing(listing.id)}
                            title="Delete listing"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
            <DialogDescription>
              Update listing details without leaving the vendor workspace.
            </DialogDescription>
          </DialogHeader>
          {renderListingForm()}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateListing} disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorProductsPage;
